// Part of readsb, a Mode-S/ADSB/TIS message decoder.
//
// readsb.c: main program & miscellany
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

#define READSB
#include "readsb.h"

static const char *df_names[33] = {
        /* 0 */ "Short Air-Air Surveillance",
        /* 1 */ NULL,
        /* 2 */ NULL,
        /* 3 */ NULL,
        /* 4 */ "Survelliance, Altitude Reply",
        /* 5 */ "Survelliance, Identity Reply",
        /* 6 */ NULL,
        /* 7 */ NULL,
        /* 8 */ NULL,
        /* 9 */ NULL,
        /* 10 */ NULL,
        /* 11 */ "All Call Reply",
        /* 12 */ NULL,
        /* 13 */ NULL,
        /* 14 */ NULL,
        /* 15 */ NULL,
        /* 16 */ "Long Air-Air ACAS",
        /* 17 */ "Extended Squitter",
        /* 18 */ "Extended Squitter (Non-Transponder)",
        /* 19 */ "Extended Squitter (Military)",
        /* 20 */ "Comm-B, Altitude Reply",
        /* 21 */ "Comm-B, Identity Reply",
        /* 22 */ "Military Use",
        /* 23 */ NULL,
        /* 24 */ "Comm-D Extended Length Message",
        /* 25 */ "Comm-D Extended Length Message",
        /* 26 */ "Comm-D Extended Length Message",
        /* 27 */ "Comm-D Extended Length Message",
        /* 28 */ "Comm-D Extended Length Message",
        /* 29 */ "Comm-D Extended Length Message",
        /* 30 */ "Comm-D Extended Length Message",
        /* 31 */ "Comm-D Extended Length Message",
        /* 32 */ "Mode A/C Reply",
};

const char *df_to_string(unsigned df) {
    if (df > 32)
        return "out of range";
    if (!df_names[df])
        return "reserved";
    return df_names[df];
}

const char *altitude_unit_to_string(altitude_unit_t unit) {
    switch (unit) {
        case UNIT_FEET:
            return "ft";
        case UNIT_METERS:
            return "m";
        default:
            return "(unknown altitude unit)";
    }
}

const char *airground_to_string(AircraftMeta__AirGround airground) {
    switch (airground) {
        case AIRCRAFT_META__AIR_GROUND__AG_GROUND:
            return "ground";
        case AIRCRAFT_META__AIR_GROUND__AG_AIRBORNE:
            return "airborne";
        case AIRCRAFT_META__AIR_GROUND__AG_INVALID:
            return "invalid";
        case AIRCRAFT_META__AIR_GROUND__AG_UNCERTAIN:
            return "airborne?";
        default:
            return "(unknown airground state)";
    }
}

const char *addrtype_to_string(AircraftMeta__AddrType type) {
    switch (type) {
        case AIRCRAFT_META__ADDR_TYPE__ADDR_ADSB_ICAO:
            return "Mode S / ADS-B";
        case AIRCRAFT_META__ADDR_TYPE__ADDR_ADSB_ICAO_NT:
            return "ADS-B, non-transponder";
        case AIRCRAFT_META__ADDR_TYPE__ADDR_ADSB_OTHER:
            return "ADS-B, other addressing scheme";
        case AIRCRAFT_META__ADDR_TYPE__ADDR_TISB_ICAO:
            return "TIS-B";
        case AIRCRAFT_META__ADDR_TYPE__ADDR_TISB_OTHER:
            return "TIS-B, other addressing scheme";
        case AIRCRAFT_META__ADDR_TYPE__ADDR_TISB_TRACKFILE:
            return "TIS-B, Mode A code and track file number";
        case AIRCRAFT_META__ADDR_TYPE__ADDR_ADSR_ICAO:
            return "ADS-R";
        case AIRCRAFT_META__ADDR_TYPE__ADDR_ADSR_OTHER:
            return "ADS-R, other addressing scheme";
        case AIRCRAFT_META__ADDR_TYPE__ADDR_MODE_A:
            return "Mode A";
        default:
            return "unknown addressing scheme";
    }
}

const char *cpr_type_to_string(cpr_type_t type) {
    switch (type) {
        case CPR_SURFACE:
            return "Surface";
        case CPR_AIRBORNE:
            return "Airborne";
        case CPR_COARSE:
            return "TIS-B Coarse";
        default:
            return "unknown CPR type";
    }
}

const char *heading_type_to_string(heading_type_t type) {
    switch (type) {
        case HEADING_GROUND_TRACK:
            return "Ground track";
        case HEADING_MAGNETIC:
            return "Mag heading";
        case HEADING_TRUE:
            return "True heading";
        case HEADING_MAGNETIC_OR_TRUE:
            return "Heading";
        case HEADING_TRACK_OR_HEADING:
            return "Track/Heading";
        default:
            return "unknown heading type";
    }
}

const char *commb_format_to_string(commb_format_t format) {
    switch (format) {
        case COMMB_EMPTY_RESPONSE:
            return "empty response";
        case COMMB_AMBIGUOUS:
            return "ambiguous format";
        case COMMB_DATALINK_CAPS:
            return "BDS1,0 Datalink capabilities";
        case COMMB_GICB_CAPS:
            return "BDS1,7 Common usage GICB capabilities";
        case COMMB_AIRCRAFT_IDENT:
            return "BDS2,0 Aircraft identification";
        case COMMB_ACAS_RA:
            return "BDS3,0 ACAS resolution advisory";
        case COMMB_VERTICAL_INTENT:
            return "BDS4,0 Selected vertical intention";
        case COMMB_TRACK_TURN:
            return "BDS5,0 Track and turn report";
        case COMMB_HEADING_SPEED:
            return "BDS6,0 Heading and speed report";
        default:
            return "unknown format";
    }
}

const char *nav_modes_to_string(nav_modes_t flags) {
    static char buf[128];

    buf[0] = 0;
    if (flags & NAV_MODE_AUTOPILOT)
        strcat(buf, "autopilot ");
    if (flags & NAV_MODE_VNAV)
        strcat(buf, "vnav ");
    if (flags & NAV_MODE_ALT_HOLD)
        strcat(buf, "althold ");
    if (flags & NAV_MODE_APPROACH)
        strcat(buf, "approach ");
    if (flags & NAV_MODE_LNAV)
        strcat(buf, "lnav ");
    if (flags & NAV_MODE_TCAS)
        strcat(buf, "tcas ");

    if (buf[0] != 0)
        buf[strlen(buf) - 1] = 0;

    return buf;
}

const char *sil_type_to_string(AircraftMeta__SilType type) {
    switch (type) {
        case AIRCRAFT_META__SIL_TYPE__SIL_UNKNOWN: return "unknown type";
        case AIRCRAFT_META__SIL_TYPE__SIL_PER_HOUR: return "per flight hour";
        case AIRCRAFT_META__SIL_TYPE__SIL_PER_SAMPLE: return "per sample";
        default: return "invalid type";
    }
}

const char *emergency_to_string(AircraftMeta__Emergency emergency) {
    switch (emergency) {
        case AIRCRAFT_META__EMERGENCY__EMERGENCY_NONE: return "no emergency";
        case AIRCRAFT_META__EMERGENCY__EMERGENCY_GENERAL: return "general emergency (7700)";
        case AIRCRAFT_META__EMERGENCY__EMERGENCY_LIFEGUARD: return "lifeguard / medical emergency";
        case AIRCRAFT_META__EMERGENCY__EMERGENCY_MINFUEL: return "minimum fuel";
        case AIRCRAFT_META__EMERGENCY__EMERGENCY_NORDO: return "no communications (7600)";
        case AIRCRAFT_META__EMERGENCY__EMERGENCY_UNLAWFUL: return "unlawful interference (7500)";
        case AIRCRAFT_META__EMERGENCY__EMERGENCY_DOWNED: return "downed aircraft";
        default: return "reserved";
    }
}

void print_hex_bytes(unsigned char *data, size_t len) {
    size_t i;
    for (i = 0; i < len; ++i) {
        printf("%02X", (unsigned) data[i]);
    }
}
