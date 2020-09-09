// Part of readsb, a Mode-S/ADSB/TIS message decoder.
//
// stats.c: statistics structures and prototypes.
//
// Copyright (c) 2020 Michael Wolf <michael@mictronics.de>
//
// This code is based on a detached fork of dump1090-fa.
//
// Copyright (c) 2015 Oliver Jowett <oliver@mutability.co.uk>
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

#ifndef STATS_H
#define STATS_H

#include "crc.h"

struct stats {
    uint64_t start;
    uint64_t end;
    // Mode S demodulator counts:
    uint32_t demod_preambles;
    uint32_t demod_rejected_bad;
    uint32_t demod_rejected_unknown_icao;
    uint32_t demod_accepted[MODES_MAX_BITERRORS + 1];
    uint64_t samples_processed;
    uint64_t samples_dropped;
    // Mode A/C demodulator counts:
    uint32_t demod_modeac;
    // number of signals with power > -3dBFS
    uint32_t strong_signal_count;
    // noise floor:
    double noise_power_sum;
    uint64_t noise_power_count;
    // mean signal power:
    double signal_power_sum;
    uint64_t signal_power_count;
    // peak signal power seen
    double peak_signal_power;
    // timing:
    struct timespec demod_cpu;
    struct timespec reader_cpu;
    struct timespec background_cpu;
    // remote messages:
    uint32_t remote_received_modeac;
    uint32_t remote_received_modes;
    uint32_t remote_rejected_bad;
    uint32_t remote_rejected_unknown_icao;
    uint32_t remote_accepted[MODES_MAX_BITERRORS + 1];
    // total messages:
    uint32_t messages_total;
    // CPR decoding:
    unsigned int cpr_surface;
    unsigned int cpr_airborne;
    unsigned int cpr_global_ok;
    unsigned int cpr_global_bad;
    unsigned int cpr_global_skipped;
    unsigned int cpr_global_range_checks;
    unsigned int cpr_global_speed_checks;
    unsigned int cpr_local_ok;
    unsigned int cpr_local_skipped;
    unsigned int cpr_local_range_checks;
    unsigned int cpr_local_speed_checks;
    unsigned int cpr_local_aircraft_relative;
    unsigned int cpr_local_receiver_relative;
    unsigned int cpr_filtered;
    // number of altitude messages ignored because
    // we had a recent DF17/18 altitude
    unsigned int suppressed_altitude_messages;
    // aircraft:
    // total "new" aircraft (i.e. not seen in the last 30 or 300s)
    unsigned int unique_aircraft;
    // we saw only a single message
    unsigned int single_message_aircraft;
    double longest_distance; // Longest range decoded, in *metres*
    uint32_t with_positions; // Aircrafts with positions
    uint32_t mlat_positions; // Positions from mlat source
    uint32_t tisb_positions; // Positions from tisb source
};

struct range_stats {
    // Maximum polar ranges
#define POLAR_RANGE_RESOLUTION 5 // degree
#define POLAR_RANGE_BUCKETS (360 / POLAR_RANGE_RESOLUTION)
    uint32_t polar_range[POLAR_RANGE_BUCKETS];
};

void add_stats(const struct stats *st1, const struct stats *st2, struct stats *target);
void display_stats(struct stats *st);
void reset_stats(struct stats *st);

void add_timespecs(const struct timespec *x, const struct timespec *y, struct timespec *z);

#endif
