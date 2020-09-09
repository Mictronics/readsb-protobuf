// Part of readsb, a Mode-S/ADSB/TIS message decoder.
//
// mode_s.c: Mode S message decoding.
//
// Copyright (c) 2020 Michael Wolf <michael@mictronics.de>
//
// This code is based on a detached fork of dump1090-fa.
//
// Copyright (c) 2014-2016 Oliver Jowett <oliver@mutability.co.uk>
//
// This file is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// any later version.
//
// This file is distributed in the hope that it will be useful, but
// WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
// General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.
//
// This file incorporates work covered by the following copyright and
// license:
//
// Copyright (C) 2012 by Salvatore Sanfilippo <antirez@gmail.com>
//
// All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are
// met:
//
//  *  Redistributions of source code must retain the above copyright
//     notice, this list of conditions and the following disclaimer.
//
//  *  Redistributions in binary form must reproduce the above copyright
//     notice, this list of conditions and the following disclaimer in the
//     documentation and/or other materials provided with the distribution.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
// A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
// HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
// SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
// LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
// DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
// THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.


#include "readsb.h"
#include "mode_s.h"
#include "ais_charset.h"

#include <math.h>
#include <string.h>

/* for PRIX64 */
#include <inttypes.h>


//
// ===================== Mode S detection and decoding  ===================
//
//
//

//=========================================================================
//
// Given the Downlink Format (DF) of the message, return the message length in bits.
//
// All known DF's 16 or greater are long. All known DF's 15 or less are short.
// There are lots of unused codes in both category, so we can assume ICAO will stick to
// these rules, meaning that the most significant bit of the DF indicates the length.
//

int modesMessageLenByType(int type) {
    return (type & 0x10) ? MODES_LONG_MSG_BITS : MODES_SHORT_MSG_BITS;
}

//
//=========================================================================
//
// In the squawk (identity) field bits are interleaved as follows in
// (message bit 20 to bit 32):
//
// C1-A1-C2-A2-C4-A4-ZERO-B1-D1-B2-D2-B4-D4
//
// So every group of three bits A, B, C, D represent an integer from 0 to 7.
//
// The actual meaning is just 4 octal numbers, but we convert it into a hex
// number tha happens to represent the four octal numbers.
//
// For more info: http://en.wikipedia.org/wiki/Gillham_code
//

static int decodeID13Field(int ID13Field) {
    int hexGillham = 0;

    if (ID13Field & 0x1000) {
        hexGillham |= 0x0010;
    } // Bit 12 = C1
    if (ID13Field & 0x0800) {
        hexGillham |= 0x1000;
    } // Bit 11 = A1
    if (ID13Field & 0x0400) {
        hexGillham |= 0x0020;
    } // Bit 10 = C2
    if (ID13Field & 0x0200) {
        hexGillham |= 0x2000;
    } // Bit  9 = A2
    if (ID13Field & 0x0100) {
        hexGillham |= 0x0040;
    } // Bit  8 = C4
    if (ID13Field & 0x0080) {
        hexGillham |= 0x4000;
    } // Bit  7 = A4
    //if (ID13Field & 0x0040) {hexGillham |= 0x0800;} // Bit  6 = X  or M
    if (ID13Field & 0x0020) {
        hexGillham |= 0x0100;
    } // Bit  5 = B1
    if (ID13Field & 0x0010) {
        hexGillham |= 0x0001;
    } // Bit  4 = D1 or Q
    if (ID13Field & 0x0008) {
        hexGillham |= 0x0200;
    } // Bit  3 = B2
    if (ID13Field & 0x0004) {
        hexGillham |= 0x0002;
    } // Bit  2 = D2
    if (ID13Field & 0x0002) {
        hexGillham |= 0x0400;
    } // Bit  1 = B4
    if (ID13Field & 0x0001) {
        hexGillham |= 0x0004;
    } // Bit  0 = D4

    return (hexGillham);
}

//
//=========================================================================
//
// Decode the 13 bit AC altitude field (in DF 20 and others).
// Returns the altitude, and set 'unit' to either UNIT_METERS or UNIT_FEET.
//

static int decodeAC13Field(int AC13Field, altitude_unit_t *unit) {
    int m_bit = AC13Field & 0x0040; // set = meters, clear = feet
    int q_bit = AC13Field & 0x0010; // set = 25 ft encoding, clear = Gillham Mode C encoding

    if (!m_bit) {
        *unit = UNIT_FEET;
        if (q_bit) {
            // N is the 11 bit integer resulting from the removal of bit Q and M
            int n = ((AC13Field & 0x1F80) >> 2) |
                    ((AC13Field & 0x0020) >> 1) |
                    (AC13Field & 0x000F);
            // The final altitude is resulting number multiplied by 25, minus 1000.
            return ((n * 25) - 1000);
        } else {
            // N is an 11 bit Gillham coded altitude
            int n = modeAToModeC(decodeID13Field(AC13Field));
            if (n < -12) {
                return INVALID_ALTITUDE;
            }

            return (100 * n);
        }
    } else {
        *unit = UNIT_METERS;
        // TODO: Implement altitude when meter unit is selected
        return INVALID_ALTITUDE;
    }
}

//
//=========================================================================
//
// Decode the 12 bit AC altitude field (in DF 17 and others).
//

static int decodeAC12Field(int AC12Field, altitude_unit_t *unit) {
    int q_bit = AC12Field & 0x10; // Bit 48 = Q

    *unit = UNIT_FEET;
    if (q_bit) {
        /// N is the 11 bit integer resulting from the removal of bit Q at bit 4
        int n = ((AC12Field & 0x0FE0) >> 1) |
                (AC12Field & 0x000F);
        // The final altitude is the resulting number multiplied by 25, minus 1000.
        return ((n * 25) - 1000);
    } else {
        // Make N a 13 bit Gillham coded altitude by inserting M=0 at bit 6
        int n = ((AC12Field & 0x0FC0) << 1) |
                (AC12Field & 0x003F);
        n = modeAToModeC(decodeID13Field(n));
        if (n < -12) {
            return INVALID_ALTITUDE;
        }

        return (100 * n);
    }
}

//
//=========================================================================
//
// Decode the 7 bit ground movement field PWL exponential style scale (ADS-B v2)
//

static float decodeMovementFieldV2(unsigned movement) {
    // Note : movement codes 0,125,126,127 are all invalid, but they are
    //        trapped for before this function is called.

    // Each movement value is a range of speeds;
    // we return the midpoint of the range (rounded to the nearest integer)
    if (movement >= 125) return 0; // invalid
    else if (movement == 124) return 180; // gs > 175kt, pick a value..
    else if (movement >= 109) return 100 + (movement - 109 + 0.5) * 5; // 100 < gs <= 175 in 5kt steps
    else if (movement >= 94) return 70 + (movement - 94 + 0.5) * 2; // 70 < gs <= 100 in 2kt steps
    else if (movement >= 39) return 15 + (movement - 39 + 0.5) * 1; // 15 < gs <= 70 in 1kt steps
    else if (movement >= 13) return 2 + (movement - 13 + 0.5) * 0.50; // 2 < gs <= 15 in 0.5kt steps
    else if (movement >= 9) return 1 + (movement - 9 + 0.5) * 0.25; // 1 < gs <= 2 in 0.25kt steps
    else if (movement >= 3) return 0.125 + (movement - 3 + 0.5) * 0.875 / 6; // 0.125 < gs <= 1 in 0.875/6 kt step
    else if (movement >= 2) return 0.125 / 2; // 0 < gs <= 0.125
        // 1: stopped, gs = 0
        // 0: no data
    else return 0;
}

//
//=========================================================================
//
// Decode the 7 bit ground movement field PWL exponential style scale (ADS-B v0)
//

static float decodeMovementFieldV0(unsigned movement) {
    // Note : movement codes 0,125,126,127 are all invalid, but they are
    //        trapped for before this function is called.

    // Each movement value is a range of speeds;
    // we return the midpoint of the range
    if (movement >= 125) return 0; // invalid
    else if (movement == 124) return 180; // gs >= 175kt, pick a value..
    else if (movement >= 109) return 100 + (movement - 109 + 0.5) * 5; // 100 < gs <= 175 in 5kt steps
    else if (movement >= 94) return 70 + (movement - 94 + 0.5) * 2; // 70 < gs <= 100 in 2kt steps
    else if (movement >= 39) return 15 + (movement - 39 + 0.5) * 1; // 15 < gs <= 70 in 1kt steps
    else if (movement >= 13) return 2 + (movement - 13 + 0.5) * 0.50; // 2 < gs <= 15 in 0.5kt steps
    else if (movement >= 9) return 1 + (movement - 9 + 0.5) * 0.25; // 1 < gs <= 2 in 0.25kt steps
    else if (movement >= 2) return 0.125 + (movement - 2 + 0.5) * 0.125; // 0.125 < gs <= 1 in 0.125kt step
        // 1: stopped, gs < 0.125kt
        // 0: no data
    else return 0;
}

// Correct a decoded native-endian Address Announced field
// (from bits 8-31) if it is affected by the given error
// syndrome. Updates *addr and returns >0 if changed, 0 if
// it was unaffected.

static int correct_aa_field(uint32_t *addr, struct errorinfo *ei) {
    int i;
    int addr_errors = 0;

    if (!ei)
        return 0;

    for (i = 0; i < ei->errors; ++i) {
        if (ei->bit[i] >= 8 && ei->bit[i] <= 31) {
            *addr ^= 1 << (31 - ei->bit[i]);
            ++addr_errors;
        }
    }

    return addr_errors;
}

// Score how plausible this ModeS message looks.
// The more positive, the more reliable the message is

// 1000: DF 0/4/5/16/24 with a CRC-derived address matching a known aircraft

// 1800: DF17/18 with good CRC and an address matching a known aircraft
// 1400: DF17/18 with good CRC and an address not matching a known aircraft
//  900: DF17/18 with 1-bit error and an address matching a known aircraft
//  700: DF17/18 with 1-bit error and an address not matching a known aircraft
//  450: DF17/18 with 2-bit error and an address matching a known aircraft
//  350: DF17/18 with 2-bit error and an address not matching a known aircraft

// 1600: DF11 with IID==0, good CRC and an address matching a known aircraft
//  800: DF11 with IID==0, 1-bit error and an address matching a known aircraft
//  750: DF11 with IID==0, good CRC and an address not matching a known aircraft
//  375: DF11 with IID==0, 1-bit error and an address not matching a known aircraft

// 1000: DF11 with IID!=0, good CRC and an address matching a known aircraft
//  500: DF11 with IID!=0, 1-bit error and an address matching a known aircraft

// 1000: DF20/21 with a CRC-derived address matching a known aircraft
//  500: DF20/21 with a CRC-derived address matching a known aircraft (bottom 16 bits only - overlay control in use)

//   -1: message might be valid, but we couldn't validate the CRC against a known ICAO
//   -2: bad message or unrepairable CRC error

static unsigned char all_zeros[14] = {0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0};

int scoreModesMessage(unsigned char *msg, int validbits) {
    int msgtype, msgbits, crc, iid;
    uint32_t addr;
    struct errorinfo *ei;

    if (validbits < 56)
        return -2;

    msgtype = getbits(msg, 1, 5); // Downlink Format
    msgbits = modesMessageLenByType(msgtype);

    if (validbits < msgbits)
        return -2;

    if (!memcmp(all_zeros, msg, msgbits / 8))
        return -2;

    crc = modesChecksum(msg, msgbits);

    switch (msgtype) {
        case 0: // short air-air surveillance
        case 4: // surveillance, altitude reply
        case 5: // surveillance, altitude reply
        case 16: // long air-air surveillance
        case 24: // Comm-D (ELM)
        case 25: // Comm-D (ELM)
        case 26: // Comm-D (ELM)
        case 27: // Comm-D (ELM)
        case 28: // Comm-D (ELM)
        case 29: // Comm-D (ELM)
        case 30: // Comm-D (ELM)
        case 31: // Comm-D (ELM)
            return icaoFilterTest(crc) ? 1000 : -1;

        case 11: // All-call reply
            iid = crc & 0x7f;
            crc = crc & 0xffff80;
            addr = getbits(msg, 9, 32);

            ei = modesChecksumDiagnose(crc, msgbits);
            if (!ei)
                return -2; // can't correct errors

            // see crc.c comments: we do not attempt to fix
            // more than single-bit errors, as two-bit
            // errors are ambiguous in DF11.
            if (ei->errors > 1)
                return -2; // can't correct errors

            // fix any errors in the address field
            correct_aa_field(&addr, ei);

            // validate address
            if (iid == 0) {
                if (icaoFilterTest(addr))
                    return 1600 / (ei->errors + 1);
                else
                    return 750 / (ei->errors + 1);
            } else {
                if (icaoFilterTest(addr))
                    return 1000 / (ei->errors + 1);
                else
                    return -1;
            }

        case 17: // Extended squitter
        case 18: // Extended squitter/non-transponder
            ei = modesChecksumDiagnose(crc, msgbits);
            if (!ei)
                return -2; // can't correct errors

            // fix any errors in the address field
            addr = getbits(msg, 9, 32);
            correct_aa_field(&addr, ei);

            if (icaoFilterTest(addr))
                return 1800 / (ei->errors + 1);
            else
                return 1400 / (ei->errors + 1);

        case 20: // Comm-B, altitude reply
        case 21: // Comm-B, identity reply
            if (icaoFilterTest(crc))
                return 1000; // Address/Parity

#if 0
            // This doesn't seem useful, as we mistake a lot of CRC errors
            // for overlay control
            if (icaoFilterTestFuzzy(crc))
                return 500; // Data/Parity
#endif

            return -2;

        default:
            // unknown message type
            return -2;
    }
}

//
//=========================================================================
//
// Decode a raw Mode S message demodulated as a stream of bytes by detectModeS(),
// and split it into fields populating a modesMessage structure.
//

static void decodeExtendedSquitter(struct modesMessage *mm);

// return 0 if all OK
//   -1: message might be valid, but we couldn't validate the CRC against a known ICAO
//   -2: bad message or unrepairable CRC error

int decodeModesMessage(struct modesMessage *mm, unsigned char *msg) {
    // Work on our local copy.
    memcpy(mm->msg, msg, MODES_LONG_MSG_BYTES);
    if (Modes.net_verbatim) {
        // Preserve the original uncorrected copy for later forwarding
        memcpy(mm->verbatim, msg, MODES_LONG_MSG_BYTES);
    }
    msg = mm->msg;

    // don't accept all-zeros messages
    if (!memcmp(all_zeros, msg, 7))
        return -2;

    // Get the message type ASAP as other operations depend on this
    mm->msgtype = getbits(msg, 1, 5); // Downlink Format
    mm->msgbits = modesMessageLenByType(mm->msgtype);
    mm->crc = modesChecksum(msg, mm->msgbits);
    mm->correctedbits = 0;
    mm->addr = 0;

    // Do checksum work and set fields that depend on the CRC
    switch (mm->msgtype) {
        case 0: // short air-air surveillance
        case 4: // surveillance, altitude reply
        case 5: // surveillance, altitude reply
        case 16: // long air-air surveillance
        case 24: // Comm-D (ELM)
        case 25: // Comm-D (ELM)
        case 26: // Comm-D (ELM)
        case 27: // Comm-D (ELM)
        case 28: // Comm-D (ELM)
        case 29: // Comm-D (ELM)
        case 30: // Comm-D (ELM)
        case 31: // Comm-D (ELM)
            // These message types use Address/Parity, i.e. our CRC syndrome is the sender's ICAO address.
            // We can't tell if the CRC is correct or not as we don't know the correct address.
            // Accept the message if it appears to be from a previously-seen aircraft
            if (!icaoFilterTest(mm->crc)) {
                return -1;
            }
            mm->source = SOURCE_MODE_S;
            mm->addr = mm->crc;
            break;

        case 11: // All-call reply
            // This message type uses Parity/Interrogator, i.e. our CRC syndrome is CL + IC from the uplink message
            // which we can't see. So we don't know if the CRC is correct or not.
            //
            // however! CL + IC only occupy the lower 7 bits of the CRC. So if we ignore those bits when testing
            // the CRC we can still try to detect/correct errors.

            mm->IID = mm->crc & 0x7f;
            if (mm->crc & 0xffff80) {
                int addr;
                struct errorinfo *ei = modesChecksumDiagnose(mm->crc & 0xffff80, mm->msgbits);
                if (!ei) {
                    return -2; // couldn't fix it
                }

                // see crc.c comments: we do not attempt to fix
                // more than single-bit errors, as two-bit
                // errors are ambiguous in DF11.
                if (ei->errors > 1)
                    return -2; // can't correct errors

                mm->correctedbits = ei->errors;
                modesChecksumFix(msg, ei);

                // check whether the corrected message looks sensible
                // we are conservative here: only accept corrected messages that
                // match an existing aircraft.
                addr = getbits(msg, 9, 32);
                if (!icaoFilterTest(addr)) {
                    return -1;
                }
            }
            mm->source = SOURCE_MODE_S_CHECKED;
            break;

        case 17: // Extended squitter
        case 18:
        { // Extended squitter/non-transponder
            struct errorinfo *ei;
            int addr1, addr2;

            // These message types use Parity/Interrogator, but are specified to set II=0

            if (mm->crc != 0) {
                ei = modesChecksumDiagnose(mm->crc, mm->msgbits);
                if (!ei) {
                    return -2; // couldn't fix it
                }

                addr1 = getbits(msg, 9, 32);
                mm->correctedbits = ei->errors;
                modesChecksumFix(msg, ei);
                addr2 = getbits(msg, 9, 32);

                // we are conservative here: only accept corrected messages that
                // match an existing aircraft.
                if (addr1 != addr2 && !icaoFilterTest(addr2)) {
                    return -1;
                }
            }

            mm->source = SOURCE_ADSB; // TIS-B decoding will override this if needed
            break;
        }

        case 20: // Comm-B, altitude reply
        case 21: // Comm-B, identity reply
            // These message types either use Address/Parity (see DF0 etc)
            // or Data Parity where the requested BDS is also xored into the top byte.
            // So not only do we not know whether the CRC is right, we also don't know if
            // the ICAO is right! Ow.

            // Try an exact match
            if (icaoFilterTest(mm->crc)) {
                // OK.
                mm->source = SOURCE_MODE_S;
                mm->addr = mm->crc;
                break;
            }

            // BDS / overlay control just doesn't work out.

            return -1; // no good

        default:
            // All other message types, we don't know how to handle their CRCs, give up
            return -2;
    }

    // decode the bulk of the message

    // AA (Address announced)
    if (mm->msgtype == 11 || mm->msgtype == 17 || mm->msgtype == 18) {
        mm->AA = mm->addr = getbits(msg, 9, 32);
    }

    // AC (Altitude Code)
    if (mm->msgtype == 0 || mm->msgtype == 4 || mm->msgtype == 16 || mm->msgtype == 20) {
        mm->AC = getbits(msg, 20, 32);
        if (mm->AC) { // Only attempt to decode if a valid (non zero) altitude is present
            mm->altitude_baro = decodeAC13Field(mm->AC, &mm->altitude_baro_unit);
            if (mm->altitude_baro != INVALID_ALTITUDE)
                mm->altitude_baro_valid = 1;
        }
    }

    // AF (DF19 Application Field) not decoded

    // CA (Capability)
    if (mm->msgtype == 11 || mm->msgtype == 17) {
        mm->CA = getbits(msg, 6, 8);

        switch (mm->CA) {
            case 0:
                mm->airground = AIRCRAFT_META__AIR_GROUND__AG_UNCERTAIN;
                break;
            case 4:
                mm->airground = AIRCRAFT_META__AIR_GROUND__AG_GROUND;
                break;
            case 5:
                mm->airground = AIRCRAFT_META__AIR_GROUND__AG_AIRBORNE;
                break;
            case 6:
                mm->airground = AIRCRAFT_META__AIR_GROUND__AG_UNCERTAIN;
                break;
            case 7:
                mm->airground = AIRCRAFT_META__AIR_GROUND__AG_UNCERTAIN;
                break;
        }
    }

    // CC (Cross-link capability)
    if (mm->msgtype == 0) {
        mm->CC = getbit(msg, 7);
    }

    // CF (Control field)
    if (mm->msgtype == 18) {
        mm->CF = getbits(msg, 6, 8);
    }

    // DR (Downlink Request)
    if (mm->msgtype == 4 || mm->msgtype == 5 || mm->msgtype == 20 || mm->msgtype == 21) {
        mm->DR = getbits(msg, 9, 13);
    }

    // FS (Flight Status)
    if (mm->msgtype == 4 || mm->msgtype == 5 || mm->msgtype == 20 || mm->msgtype == 21) {
        mm->FS = getbits(msg, 6, 8);
        mm->alert_valid = 1;
        mm->spi_valid = 1;

        switch (mm->FS) {
            case 0:
                mm->airground = AIRCRAFT_META__AIR_GROUND__AG_UNCERTAIN;
                break;
            case 1:
                mm->airground = AIRCRAFT_META__AIR_GROUND__AG_GROUND;
                break;
            case 2:
                mm->airground = AIRCRAFT_META__AIR_GROUND__AG_UNCERTAIN;
                mm->alert = 1;
                break;
            case 3:
                mm->airground = AIRCRAFT_META__AIR_GROUND__AG_GROUND;
                mm->alert = 1;
                break;
            case 4:
                mm->airground = AIRCRAFT_META__AIR_GROUND__AG_UNCERTAIN;
                mm->alert = 1;
                mm->spi = 1;
                break;
            case 5:
                mm->airground = AIRCRAFT_META__AIR_GROUND__AG_UNCERTAIN;
                mm->spi = 1;
                break;
            default:
                mm->spi_valid = 0;
                mm->alert_valid = 0;
                break;
        }
    }

    // ID (Identity)
    if (mm->msgtype == 5 || mm->msgtype == 21) {
        // Gillham encoded Squawk
        mm->ID = getbits(msg, 20, 32);
        if (mm->ID) {
            mm->squawk = decodeID13Field(mm->ID);
            mm->squawk_valid = 1;
        }
    }

    // KE (Control, ELM)
    if (mm->msgtype >= 24 && mm->msgtype <= 31) {
        mm->KE = getbit(msg, 4);
    }

    // MB (messsage, Comm-B)
    if (mm->msgtype == 20 || mm->msgtype == 21) {
        memcpy(mm->MB, &msg[4], 7);
        decodeCommB(mm);
    }

    // MD (message, Comm-D)
    if (mm->msgtype >= 24 && mm->msgtype <= 31) {
        memcpy(mm->MD, &msg[1], 10);
    }

    // ME (message, extended squitter)
    if (mm->msgtype == 17 || mm->msgtype == 18) {
        memcpy(mm->ME, &msg[4], 7);
        decodeExtendedSquitter(mm);
    }

    // MV (message, ACAS)
    if (mm->msgtype == 16) {
        memcpy(mm->MV, &msg[4], 7);
    }

    // ND (number of D-segment, Comm-D)
    if (mm->msgtype >= 24 && mm->msgtype <= 31) {
        mm->ND = getbits(msg, 5, 8);
    }

    // RI (Reply information, ACAS)
    if (mm->msgtype == 0 || mm->msgtype == 16) {
        mm->RI = getbits(msg, 14, 17);
    }

    // SL (Sensitivity level, ACAS)
    if (mm->msgtype == 0 || mm->msgtype == 16) {
        mm->SL = getbits(msg, 9, 11);
    }

    // UM (Utility Message)
    if (mm->msgtype == 4 || mm->msgtype == 5 || mm->msgtype == 20 || mm->msgtype == 21) {
        mm->UM = getbits(msg, 14, 19);
    }

    // VS (Vertical Status)
    if (mm->msgtype == 0 || mm->msgtype == 16) {
        mm->VS = getbit(msg, 6);
        if (mm->VS)
            mm->airground = AIRCRAFT_META__AIR_GROUND__AG_GROUND;
        else
            mm->airground = AIRCRAFT_META__AIR_GROUND__AG_UNCERTAIN;
    }

    if (!mm->correctedbits && (mm->msgtype == 17 || (mm->msgtype == 11 && mm->IID == 0))) {
        // No CRC errors seen, and either it was an DF17 extended squitter
        // or a DF11 acquisition squitter with II = 0. We probably have the right address.

        // Don't do this for DF18, as a DF18 transmitter doesn't necessarily have a
        // Mode S transponder.

        // NB this is the only place that adds addresses!
        icaoFilterAdd(mm->addr);
    }

    // MLAT overrides all other sources
    if (mm->remote && mm->timestampMsg == MAGIC_MLAT_TIMESTAMP)
        mm->source = SOURCE_MLAT;

    // all done
    return 0;
}

static void decodeESIdentAndCategory(struct modesMessage *mm) {
    // Aircraft Identification and Category
    unsigned char *me = mm->ME;

    mm->mesub = getbits(me, 6, 8);

    mm->callsign[0] = ais_charset[getbits(me, 9, 14)];
    mm->callsign[1] = ais_charset[getbits(me, 15, 20)];
    mm->callsign[2] = ais_charset[getbits(me, 21, 26)];
    mm->callsign[3] = ais_charset[getbits(me, 27, 32)];
    mm->callsign[4] = ais_charset[getbits(me, 33, 38)];
    mm->callsign[5] = ais_charset[getbits(me, 39, 44)];
    mm->callsign[6] = ais_charset[getbits(me, 45, 50)];
    mm->callsign[7] = ais_charset[getbits(me, 51, 56)];
    mm->callsign[8] = 0;

    mm->callsign_valid = 1;

    // actually valid?
    for (unsigned i = 0; i < 8; ++i) {
        if (!(mm->callsign[i] >= 'A' && mm->callsign[i] <= 'Z') &&
                !(mm->callsign[i] >= '0' && mm->callsign[i] <= '9') &&
                mm->callsign[i] != ' ') {
            // Bad callsign, ignore it
            mm->callsign_valid = 0;
            break;
        }
    }

    mm->category = ((0x0E - mm->metype) << 4) | mm->mesub;
    mm->category_valid = 1;
}

// Handle setting a non-ICAO address

static void setIMF(struct modesMessage *mm) {
    mm->addr |= MODES_NON_ICAO_ADDRESS;
    switch (mm->addrtype) {
        case AIRCRAFT_META__ADDR_TYPE__ADDR_ADSB_ICAO:
        case AIRCRAFT_META__ADDR_TYPE__ADDR_ADSB_ICAO_NT:
            // Shouldn't happen, but let's try to handle it
            mm->addrtype = AIRCRAFT_META__ADDR_TYPE__ADDR_ADSB_OTHER;
            break;

        case AIRCRAFT_META__ADDR_TYPE__ADDR_TISB_ICAO:
            mm->addrtype = AIRCRAFT_META__ADDR_TYPE__ADDR_TISB_TRACKFILE;
            break;

        case AIRCRAFT_META__ADDR_TYPE__ADDR_ADSR_ICAO:
            mm->addrtype = AIRCRAFT_META__ADDR_TYPE__ADDR_ADSR_OTHER;
            break;

        default:
            // Nothing.
            break;
    }
}

static void decodeESAirborneVelocity(struct modesMessage *mm, int check_imf) {
    // Airborne Velocity Message
    unsigned char *me = mm->ME;

    // 1-5: ME type
    // 6-8: ME subtype
    mm->mesub = getbits(me, 6, 8);

    if (mm->mesub < 1 || mm->mesub > 4)
        return;

    // 9: IMF or Intent Change
    if (check_imf && getbit(me, 9))
        setIMF(mm);

    // 10: reserved

    // 11-13: NACv (NUCr in v0, maps directly to NACv in v2)
    mm->accuracy.nac_v_valid = 1;
    mm->accuracy.nac_v = getbits(me, 11, 13);

    // 14-35: speed/velocity depending on subtype
    switch (mm->mesub) {
        case 1: case 2:
        {
            // 14:    E/W direction
            // 15-24: E/W speed
            // 25:    N/S direction
            // 26-35: N/S speed
            unsigned ew_raw = getbits(me, 15, 24);
            unsigned ns_raw = getbits(me, 26, 35);

            if (ew_raw && ns_raw) {
                int ew_vel = (ew_raw - 1) * (getbit(me, 14) ? -1 : 1) * ((mm->mesub == 2) ? 4 : 1);
                int ns_vel = (ns_raw - 1) * (getbit(me, 25) ? -1 : 1) * ((mm->mesub == 2) ? 4 : 1);

                // Compute velocity and angle from the two speed components
                mm->gs.v0 = mm->gs.v2 = mm->gs.selected = sqrtf((ns_vel * ns_vel) + (ew_vel * ew_vel) + 0.5);
                mm->gs_valid = 1;

                if (mm->gs.selected > 0) {
                    float ground_track = atan2(ew_vel, ns_vel) * 180.0 / M_PI;
                    // We don't want negative values but a 0-360 scale
                    if (ground_track < 0)
                        ground_track += 360;
                    mm->heading = ground_track;
                    mm->heading_type = HEADING_GROUND_TRACK;
                    mm->heading_valid = 1;
                }
            }
            break;
        }

        case 3: case 4:
        {
            // 14:    heading status
            // 15-24: heading
            if (getbit(me, 14)) {
                mm->heading_valid = 1;
                mm->heading = getbits(me, 15, 24) * 360.0 / 1024.0;
                mm->heading_type = HEADING_MAGNETIC_OR_TRUE;
            }

            // 25: airspeed type
            // 26-35: airspeed
            unsigned airspeed = getbits(me, 26, 35);
            if (airspeed) {
                unsigned speed = (airspeed - 1) * (mm->mesub == 4 ? 4 : 1);
                if (getbit(me, 25)) {
                    mm->tas_valid = 1;
                    mm->tas = speed;
                } else {
                    mm->ias_valid = 1;
                    mm->ias = speed;
                }
            }

            break;
        }
    }

    // 36: vert rate source
    // 37: vert rate sign
    // 38-46: vert rate magnitude
    unsigned vert_rate = getbits(me, 38, 46);
    unsigned vert_rate_is_baro = getbit(me, 36);
    if (vert_rate) {
        int rate = (vert_rate - 1) * (getbit(me, 37) ? -64 : 64);
        if (vert_rate_is_baro) {
            mm->baro_rate = rate;
            mm->baro_rate_valid = 1;
        } else {
            mm->geom_rate = rate;
            mm->geom_rate_valid = 1;
        }
    }

    // 47-48: reserved

    // 49: baro/geom delta sign
    // 50-56: baro/geom delta magnitude
    unsigned raw_delta = getbits(me, 50, 56);
    if (raw_delta) {
        mm->geom_delta_valid = 1;
        mm->geom_delta = (raw_delta - 1) * (getbit(me, 49) ? -25 : 25);
    }
}

static void decodeESSurfacePosition(struct modesMessage *mm, int check_imf) {
    // Surface position and movement
    unsigned char *me = mm->ME;

    mm->airground = AIRCRAFT_META__AIR_GROUND__AG_GROUND; // definitely.
    mm->cpr_valid = 1;
    mm->cpr_type = CPR_SURFACE;

    // 6-12: Movement
    unsigned movement = getbits(me, 6, 12);
    if (movement > 0 && movement < 125) {
        mm->gs_valid = 1;
        mm->gs.selected = mm->gs.v0 = decodeMovementFieldV0(movement); // assumed v0 until told otherwise
        mm->gs.v2 = decodeMovementFieldV2(movement);
    }

    // 13: Heading/track status
    // 14-20: Heading/track
    if (getbit(me, 13)) {
        mm->heading_valid = 1;
        mm->heading = getbits(me, 14, 20) * 360.0 / 128.0;
        mm->heading_type = HEADING_TRACK_OR_HEADING;
    }

    // 21: IMF or T flag
    if (check_imf && getbit(me, 21))
        setIMF(mm);

    // 22: F flag (odd/even)
    mm->cpr_odd = getbit(me, 22);

    // 23-39: CPR encoded latitude
    mm->cpr_lat = getbits(me, 23, 39);
    // 40-56: CPR encoded longitude
    mm->cpr_lon = getbits(me, 40, 56);
}

static void decodeESAirbornePosition(struct modesMessage *mm, int check_imf) {
    // Airborne position and altitude
    unsigned char *me = mm->ME;

    // 6-7: surveillance status
    switch (getbits(me, 6, 7)) {
        case 0:
            // no status
            mm->alert_valid = mm->spi_valid = 1;
            mm->alert = mm->spi = 0;
            break;
        case 1: // permanent alert
        case 2: // temporary alert
            mm->alert_valid = 1;
            mm->alert = 1;
            // states 1/2 override state 3, so we don't know SPI status here.
            break;
        case 3: // SPI
            // we know there's no alert in this case
            mm->alert_valid = mm->spi_valid = 1;
            mm->alert = 0;
            mm->spi = 1;
            break;
    }

    // 8: IMF or NIC supplement-B

    if (check_imf) {
        if (getbit(me, 8))
            setIMF(mm);
    } else {
        // NIC-B (v2) or SAF (v0/v1)
        mm->accuracy.nic_b_valid = 1;
        mm->accuracy.nic_b = getbit(me, 8);
    }

    // 9-20: altitude
    unsigned AC12Field = getbits(me, 9, 20);

    if (mm->metype == 0) {
        // no position information
    } else {
        // 21: T flag (UTC sync or not)
        // 22: F flag (odd or even)
        // 23-39: CPR encoded latitude
        // 40-56: CPR encoded longitude

        mm->cpr_lat = getbits(me, 23, 39);
        mm->cpr_lon = getbits(me, 40, 56);

        // Catch some common failure modes and don't mark them as valid
        // (so they won't be used for positioning)
        if (AC12Field == 0 && mm->cpr_lon == 0 && (mm->cpr_lat & 0x0fff) == 0 && mm->metype == 15) {
            // Seen from at least:
            //   400F3F (Eurocopter ECC155 B1) - Bristow Helicopters
            //   4008F3 (BAE ATP) - Atlantic Airlines
            //   400648 (BAE ATP) - Atlantic Airlines
            // altitude == 0, longitude == 0, type == 15 and zeros in latitude LSB.
            // Can alternate with valid reports having type == 14
            Modes.stats_current.cpr_filtered++;
        } else {
            // Otherwise, assume it's valid.
            mm->cpr_valid = 1;
            mm->cpr_type = CPR_AIRBORNE;
            mm->cpr_odd = getbit(me, 22);
        }
    }

    if (AC12Field && mm->airground != AIRCRAFT_META__AIR_GROUND__AG_GROUND) {// Only attempt to decode if a valid (non zero) altitude is present and not on ground
        altitude_unit_t unit;
        int alt = decodeAC12Field(AC12Field, &unit);
        if (alt != INVALID_ALTITUDE) {
            if (mm->metype == 20 || mm->metype == 21 || mm->metype == 22) {
                mm->altitude_geom = alt;
                mm->altitude_geom_unit = unit;
                mm->altitude_geom_valid = 1;
            } else {
                mm->altitude_baro = alt;
                mm->altitude_baro_unit = unit;
                mm->altitude_baro_valid = 1;
            }
        }
    }
}

static void decodeESTestMessage(struct modesMessage *mm) {
    unsigned char *me = mm->ME;

    mm->mesub = getbits(me, 6, 8);

    if (mm->mesub == 7) { // (see 1090-WP-15-20)
        int ID13Field = getbits(me, 9, 21);
        if (ID13Field) {
            mm->squawk_valid = 1;
            mm->squawk = decodeID13Field(ID13Field);
        }
    }
}

static void decodeESAircraftStatus(struct modesMessage *mm, int check_imf) {
    // Extended Squitter Aircraft Status
    unsigned char *me = mm->ME;

    mm->mesub = getbits(me, 6, 8);

    if (mm->mesub == 1) { // Emergency status squawk field
        mm->emergency_valid = 1;
        mm->emergency = (AircraftMeta__Emergency) getbits(me, 9, 11);

        unsigned ID13Field = getbits(me, 12, 24);
        if (ID13Field) {
            mm->squawk_valid = 1;
            mm->squawk = decodeID13Field(ID13Field);
        }

        if (check_imf && getbit(me, 56))
            setIMF(mm);
    }
}

static void decodeESTargetStatus(struct modesMessage *mm, int check_imf) {
    unsigned char *me = mm->ME;

    mm->mesub = getbits(me, 6, 7); // an unusual message: only 2 bits of subtype

    if (check_imf && getbit(me, 51))
        setIMF(mm);

    if (mm->mesub == 0 && getbit(me, 11) == 0) { // Target state and status, V1
        // 8-9: vertical source
        switch (getbits(me, 8, 9)) {
            case 1:
                mm->nav.altitude_source = NAV_ALT_MCP;
                break;
            case 2:
                mm->nav.altitude_source = NAV_ALT_AIRCRAFT;
                break;
            case 3:
                mm->nav.altitude_source = NAV_ALT_FMS;
                break;
            default:
                // nothing
                break;
        }
        // 10: target altitude type (MSL or Baro, ignored)
        // 11: backward compatibility bit, always 0
        // 12-13: target alt capabilities (ignored)
        // 14-15: vertical mode
        switch (getbits(me, 14, 15)) {
            case 1: // "acquiring"
                mm->nav.modes_valid = 1;
                if (mm->nav.altitude_source == NAV_ALT_FMS) {
                    mm->nav.modes |= NAV_MODE_VNAV;
                } else {
                    mm->nav.modes |= NAV_MODE_AUTOPILOT;
                }
                break;
            case 2: // "maintaining"
                mm->nav.modes_valid = 1;
                if (mm->nav.altitude_source == NAV_ALT_FMS) {
                    mm->nav.modes |= NAV_MODE_VNAV;
                } else if (mm->nav.altitude_source == NAV_ALT_AIRCRAFT) {
                    mm->nav.modes |= NAV_MODE_ALT_HOLD;
                } else {
                    mm->nav.modes |= NAV_MODE_AUTOPILOT;
                }
                break;
            default:
                // nothing
                break;
        }

        // 16-25: target altitude
        int alt = -1000 + 100 * getbits(me, 16, 25);
        switch (mm->nav.altitude_source) {
            case NAV_ALT_MCP:
                mm->nav.mcp_altitude_valid = 1;
                mm->nav.mcp_altitude = alt;
                break;
            case NAV_ALT_FMS:
                mm->nav.fms_altitude_valid = 1;
                mm->nav.fms_altitude = alt;
                break;
            default:
                // nothing
                break;
        }
        // 26-27: horizontal data source
        unsigned h_source = getbits(me, 26, 27);
        if (h_source != 0) {
            // 28-36: target heading/track
            mm->nav.heading_valid = 1;
            mm->nav.heading = getbits(me, 28, 36);
            // 37: track vs heading
            if (getbit(me, 37)) {
                mm->nav.heading_type = HEADING_GROUND_TRACK;
            } else {
                mm->nav.heading_type = HEADING_MAGNETIC_OR_TRUE;
            }
        }
        // 38-39: horizontal mode
        switch (getbits(me, 38, 39)) {
            case 1: // acquiring
            case 2: // maintaining
                mm->nav.modes_valid = 1;
                if (h_source == 3) { // FMS
                    mm->nav.modes |= NAV_MODE_LNAV;
                } else {
                    mm->nav.modes |= NAV_MODE_AUTOPILOT;
                }
                break;
            default:
                // nothing
                break;
        }

        // 40-43: NACp
        mm->accuracy.nac_p_valid = 1;
        mm->accuracy.nac_p = getbits(me, 40, 43);

        // 44:    NICbaro
        mm->accuracy.nic_baro_valid = 1;
        mm->accuracy.nic_baro = getbit(me, 44);

        // 45-46: SIL
        mm->accuracy.sil = getbits(me, 45, 46);
        mm->accuracy.sil_type = AIRCRAFT_META__SIL_TYPE__SIL_UNKNOWN;

        // 47-51: reserved

        // 52-53: TCAS status
        switch (getbits(me, 52, 53)) {
            case 1:
                mm->nav.modes_valid = 1;
                // no tcas
                break;
            case 2:
            case 3:
                mm->nav.modes_valid = 1;
                mm->nav.modes |= NAV_MODE_TCAS;
                break;
            case 0:
                // assume TCAS if we had any other modes
                // but don't enable modes just for this
                mm->nav.modes |= NAV_MODE_TCAS;
                break;
            default:
                // nothing
                break;
        }


        // 54-56: emergency/priority
        mm->emergency_valid = 1;
        mm->emergency = (AircraftMeta__Emergency) getbits(me, 54, 56);
    } else if (mm->mesub == 1) { // Target state and status, V2
        // 8: SIL
        unsigned is_fms = getbit(me, 9);

        unsigned alt_bits = getbits(me, 10, 20);
        if (alt_bits != 0) {
            if (is_fms) {
                mm->nav.fms_altitude_valid = 1;
                mm->nav.fms_altitude = (alt_bits - 1) * 32;
            } else {
                mm->nav.mcp_altitude_valid = 1;
                mm->nav.mcp_altitude = (alt_bits - 1) * 32;
            }
        }

        unsigned baro_bits = getbits(me, 21, 29);
        if (baro_bits != 0) {
            mm->nav.qnh_valid = 1;
            mm->nav.qnh = 800.0 + (baro_bits - 1) * 0.8;
        }

        if (getbit(me, 30)) {
            mm->nav.heading_valid = 1;
            // two's complement -180..+180, which is conveniently
            // also the same as unsigned 0..360
            mm->nav.heading = getbits(me, 31, 39) * 180.0 / 256.0;
            mm->nav.heading_type = HEADING_MAGNETIC_OR_TRUE;
        }

        // 40-43: NACp
        mm->accuracy.nac_p_valid = 1;
        mm->accuracy.nac_p = getbits(me, 40, 43);

        // 44:    NICbaro
        mm->accuracy.nic_baro_valid = 1;
        mm->accuracy.nic_baro = getbit(me, 44);

        // 45-46: SIL
        mm->accuracy.sil = getbits(me, 45, 46);
        mm->accuracy.sil_type = AIRCRAFT_META__SIL_TYPE__SIL_UNKNOWN;

        // 47: mode bits validity
        if (getbit(me, 47)) {
            // 48-54: mode bits
            mm->nav.modes_valid = 1;
            mm->nav.modes =
                    (getbit(me, 48) ? NAV_MODE_AUTOPILOT : 0) |
                    (getbit(me, 49) ? NAV_MODE_VNAV : 0) |
                    (getbit(me, 50) ? NAV_MODE_ALT_HOLD : 0) |
                    // 51: IMF
                    (getbit(me, 52) ? NAV_MODE_APPROACH : 0) |
                    (getbit(me, 53) ? NAV_MODE_TCAS : 0) |
                    (getbit(me, 54) ? NAV_MODE_LNAV : 0);
        }

        // 55-56 reserved
    }
}

static void decodeESOperationalStatus(struct modesMessage *mm, int check_imf) {
    unsigned char *me = mm->ME;

    mm->mesub = getbits(me, 6, 8);

    // Aircraft Operational Status
    if (check_imf && getbit(me, 56))
        setIMF(mm);

    if (mm->mesub == 0 || mm->mesub == 1) {
        mm->opstatus.valid = 1;
        mm->opstatus.version = getbits(me, 41, 43);

        switch (mm->opstatus.version) {
            case 0:
                if (mm->mesub == 0 && getbits(me, 9, 10) == 0) {
                    mm->opstatus.cc_acas = !getbit(me, 12);
                    mm->opstatus.cc_cdti = getbit(me, 13);
                }
                break;

            case 1:
                if (getbits(me, 25, 26) == 0) {
                    mm->opstatus.om_acas_ra = getbit(me, 27);
                    mm->opstatus.om_ident = getbit(me, 28);
                    mm->opstatus.om_atc = getbit(me, 29);
                }

                if (mm->mesub == 0 && getbits(me, 9, 10) == 0 && getbits(me, 13, 14) == 0) {
                    // airborne
                    mm->opstatus.cc_acas = !getbit(me, 11);
                    mm->opstatus.cc_cdti = getbit(me, 12);
                    mm->opstatus.cc_arv = getbit(me, 15);
                    mm->opstatus.cc_ts = getbit(me, 16);
                    mm->opstatus.cc_tc = getbits(me, 17, 18);
                } else if (mm->mesub == 1 && getbits(me, 9, 10) == 0 && getbits(me, 13, 14) == 0) {
                    // surface
                    mm->opstatus.cc_poa = getbit(me, 11);
                    mm->opstatus.cc_cdti = getbit(me, 12);
                    mm->opstatus.cc_b2_low = getbit(me, 15);
                    mm->opstatus.cc_lw_valid = 1;
                    mm->opstatus.cc_lw = getbits(me, 21, 24);
                }

                mm->accuracy.nic_a_valid = 1;
                mm->accuracy.nic_a = getbit(me, 44);
                mm->accuracy.nac_p_valid = 1;
                mm->accuracy.nac_p = getbits(me, 45, 48);
                mm->accuracy.sil_type = AIRCRAFT_META__SIL_TYPE__SIL_UNKNOWN;
                mm->accuracy.sil = getbits(me, 51, 52);

                mm->opstatus.hrd = getbit(me, 54) ? HEADING_MAGNETIC : HEADING_TRUE;

                if (mm->mesub == 0) {
                    mm->accuracy.nic_baro_valid = 1;
                    mm->accuracy.nic_baro = getbit(me, 53);
                } else {
                    // see DO=260B §2.2.3.2.7.2.12
                    // TAH=0 : surface movement reports ground track
                    // TAH=1 : surface movement reports aircraft heading
                    mm->opstatus.tah = getbit(me, 53) ? mm->opstatus.hrd : HEADING_GROUND_TRACK;
                }
                break;

            case 2:
                if (getbits(me, 25, 26) == 0) {
                    mm->opstatus.om_acas_ra = getbit(me, 27);
                    mm->opstatus.om_ident = getbit(me, 28);
                    mm->opstatus.om_atc = getbit(me, 29);
                    mm->opstatus.om_saf = getbit(me, 30);
                    mm->accuracy.sda_valid = 1;
                    mm->accuracy.sda = getbits(me, 31, 32);
                }

                if (mm->mesub == 0 && getbits(me, 9, 10) == 0) {
                    // airborne
                    mm->opstatus.cc_acas = getbit(me, 11); // nb inverted sense versus v0/v1
                    mm->opstatus.cc_1090_in = getbit(me, 12);
                    mm->opstatus.cc_arv = getbit(me, 15);
                    mm->opstatus.cc_ts = getbit(me, 16);
                    mm->opstatus.cc_tc = getbits(me, 17, 18);
                    mm->opstatus.cc_uat_in = getbit(me, 19);
                } else if (mm->mesub == 1 && getbits(me, 9, 10) == 0) {
                    // surface
                    mm->opstatus.cc_poa = getbit(me, 11);
                    mm->opstatus.cc_1090_in = getbit(me, 12);
                    mm->opstatus.cc_b2_low = getbit(me, 15);
                    mm->opstatus.cc_uat_in = getbit(me, 16);
                    mm->accuracy.nac_v_valid = 1;
                    mm->accuracy.nac_v = getbits(me, 17, 19);
                    mm->accuracy.nic_c_valid = 1;
                    mm->accuracy.nic_c = getbit(me, 20);
                    mm->opstatus.cc_lw_valid = 1;
                    mm->opstatus.cc_lw = getbits(me, 21, 24);
                    mm->opstatus.cc_antenna_offset = getbits(me, 33, 40);
                }

                mm->accuracy.nic_a_valid = 1;
                mm->accuracy.nic_a = getbit(me, 44);
                mm->accuracy.nac_p_valid = 1;
                mm->accuracy.nac_p = getbits(me, 45, 48);
                mm->accuracy.sil = getbits(me, 51, 52);
                mm->accuracy.sil_type = getbit(me, 55) ? AIRCRAFT_META__SIL_TYPE__SIL_PER_SAMPLE : AIRCRAFT_META__SIL_TYPE__SIL_PER_HOUR;
                mm->opstatus.hrd = getbit(me, 54) ? HEADING_MAGNETIC : HEADING_TRUE;
                if (mm->mesub == 0) {
                    mm->accuracy.gva_valid = 1;
                    mm->accuracy.gva = getbits(me, 49, 50);
                    mm->accuracy.nic_baro_valid = 1;
                    mm->accuracy.nic_baro = getbit(me, 53);
                } else {
                    // see DO=260B §2.2.3.2.7.2.12
                    // TAH=0 : surface movement reports ground track
                    // TAH=1 : surface movement reports aircraft heading
                    mm->opstatus.tah = getbit(me, 53) ? mm->opstatus.hrd : HEADING_GROUND_TRACK;
                }
                break;
        }
    }
}

static void decodeExtendedSquitter(struct modesMessage *mm) {
    unsigned char *me = mm->ME;
    unsigned metype = mm->metype = getbits(me, 1, 5);
    unsigned check_imf = 0;

    // Check CF on DF18 to work out the format of the ES and whether we need to look for an IMF bit
    if (mm->msgtype == 18) {
        switch (mm->CF) {
            case 0: // ADS-B Message from a non-transponder device, AA field holds 24-bit ICAO aircraft address
                mm->addrtype = AIRCRAFT_META__ADDR_TYPE__ADDR_ADSB_ICAO_NT;
                break;

            case 1: // Reserved for ADS-B Message in which the AA field holds anonymous address or ground vehicle address or fixed obstruction address
                mm->addrtype = AIRCRAFT_META__ADDR_TYPE__ADDR_ADSB_OTHER;
                mm->addr |= MODES_NON_ICAO_ADDRESS;
                break;

            case 2: // Fine TIS-B Message
                // IMF=0: AA field contains the 24-bit ICAO aircraft address
                // IMF=1: AA field contains the 12-bit Mode A code followed by a 12-bit track file number
                mm->source = SOURCE_TISB;
                mm->addrtype = AIRCRAFT_META__ADDR_TYPE__ADDR_TISB_ICAO;
                check_imf = 1;
                break;

            case 3: //   Coarse TIS-B airborne position and velocity.
                // IMF=0: AA field contains the 24-bit ICAO aircraft address
                // IMF=1: AA field contains the 12-bit Mode A code followed by a 12-bit track file number

                // For now we only look at the IMF bit.
                mm->source = SOURCE_TISB;
                mm->addrtype = AIRCRAFT_META__ADDR_TYPE__ADDR_TISB_ICAO;
                if (getbit(me, 1))
                    setIMF(mm);
                return;

            case 5: // Fine TIS-B Message, AA field contains a non-ICAO 24-bit address
                mm->addrtype = AIRCRAFT_META__ADDR_TYPE__ADDR_TISB_OTHER;
                mm->source = SOURCE_TISB;
                mm->addr |= MODES_NON_ICAO_ADDRESS;
                break;

            case 6: // Rebroadcast of ADS-B Message from an alternate data link
                // IMF=0: AA field holds 24-bit ICAO aircraft address
                // IMF=1: AA field holds anonymous address or ground vehicle address or fixed obstruction address
                mm->addrtype = AIRCRAFT_META__ADDR_TYPE__ADDR_ADSR_ICAO;
                mm->source = SOURCE_ADSR;
                check_imf = 1;
                break;

            default: // All others, we don't know the format.
                mm->addrtype = AIRCRAFT_META__ADDR_TYPE__ADDR_UNKNOWN;
                mm->addr |= MODES_NON_ICAO_ADDRESS; // assume non-ICAO
                return;
        }
    }

    switch (metype) {
        case 1: case 2: case 3: case 4:
            decodeESIdentAndCategory(mm);
            break;

        case 19:
            decodeESAirborneVelocity(mm, check_imf);
            break;

        case 5: case 6: case 7: case 8:
            decodeESSurfacePosition(mm, check_imf);
            break;

        case 0: // Airborne position, baro altitude only
        case 9: case 10: case 11: case 12: case 13: case 14: case 15: case 16: case 17: case 18: // Airborne position, baro
        case 20: case 21: case 22: // Airborne position, geometric altitude (HAE or MSL)
            decodeESAirbornePosition(mm, check_imf);
            break;

        case 23:
            decodeESTestMessage(mm);
            break;

        case 24: // Reserved for Surface System Status
            break;

        case 28:
            decodeESAircraftStatus(mm, check_imf);
            break;

        case 29:
            decodeESTargetStatus(mm, check_imf);
            break;

        case 30: // Aircraft Operational Coordination
            break;

        case 31:
            decodeESOperationalStatus(mm, check_imf);
            break;

        default:
            break;
    }
}

int esTypeHasSubtype(unsigned metype) {
    if (metype <= 18) {
        return 0;
    }

    if (metype >= 20 && metype <= 22) {
        return 0;
    }

    return 1;
}

const char *esTypeName(unsigned metype, unsigned mesub) {
    switch (metype) {
        case 0:
            return "No position information (airborne or surface)";

        case 1: case 2: case 3: case 4:
            return "Aircraft identification and category";

        case 5: case 6: case 7: case 8:
            return "Surface position";

        case 9: case 10: case 11: case 12:
        case 13: case 14: case 15: case 16:
        case 17: case 18:
            return "Airborne position (barometric altitude)";

        case 19:
            switch (mesub) {
                case 1:
                    return "Airborne velocity over ground, subsonic";
                case 2:
                    return "Airborne velocity over ground, supersonic";
                case 3:
                    return "Airspeed and heading, subsonic";
                case 4:
                    return "Airspeed and heading, supersonic";
                default:
                    return "Unknown";
            }

        case 20: case 21: case 22:
            return "Airborne position (geometric altitude)";

        case 23:
            switch (mesub) {
                case 0:
                    return "Test message";
                case 7:
                    return "National use / 1090-WP-15-20 Mode A squawk";
                default:
                    return "Unknown";
            }

        case 24:
            return "Reserved for surface system status";

        case 27:
            return "Reserved for trajectory change";

        case 28:
            switch (mesub) {
                case 1:
                    return "Emergency/priority status";
                case 2:
                    return "ACAS RA broadcast";
                default:
                    return "Unknown";
            }

        case 29:
            switch (mesub) {
                case 0:
                    return "Target state and status (V1)";
                case 1:
                    return "Target state and status (V2)";
                default:
                    return "Unknown";
            }

        case 30:
            return "Aircraft Operational Coordination";

        case 31: // Aircraft Operational Status
            switch (mesub) {
                case 0:
                    return "Aircraft operational status (airborne)";
                case 1:
                    return "Aircraft operational status (surface)";
                default:
                    return "Unknown";
            }

        default:
            return "Unknown";
    }
}

//
// ===================== Mode S detection and decoding  ===================
//
