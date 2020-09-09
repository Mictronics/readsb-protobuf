// Part of readsb, a Mode-S/ADSB/TIS message decoder.
//
// stats.c: statistics helpers.
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

#include <math.h>
#include <stdio.h>
#include <string.h>
#include <time.h>
#include "readsb.h"
#include "station.h"

void add_timespecs(const struct timespec *x, const struct timespec *y, struct timespec *z) {
    z->tv_sec = x->tv_sec + y->tv_sec;
    z->tv_nsec = x->tv_nsec + y->tv_nsec;
    z->tv_sec += z->tv_nsec / 1000000000L;
    z->tv_nsec = z->tv_nsec % 1000000000L;
}

void display_stats(struct stats *st) {
    int j;
    time_t tt_start, tt_end;
    struct tm tm_start, tm_end;
    char tb_start[30], tb_end[30];

    printf("\n\n");

    tt_start = st->start / 1000;
    localtime_r(&tt_start, &tm_start);
    strftime(tb_start, sizeof (tb_start), "%c %Z", &tm_start);
    tt_end = st->end / 1000;
    localtime_r(&tt_end, &tm_end);
    strftime(tb_end, sizeof (tb_end), "%c %Z", &tm_end);

    printf("Statistics: %s - %s\n", tb_start, tb_end);

    if (!Modes.net_only) {
        printf("Local receiver:\n");
        printf("  %llu samples processed\n", (unsigned long long) st->samples_processed);
        printf("  %llu samples dropped\n", (unsigned long long) st->samples_dropped);

        printf("  %u Mode A/C messages received\n", st->demod_modeac);
        printf("  %u Mode-S message preambles received\n", st->demod_preambles);
        printf("    %u with bad message format or invalid CRC\n", st->demod_rejected_bad);
        printf("    %u with unrecognized ICAO address\n", st->demod_rejected_unknown_icao);
        printf("    %u accepted with correct CRC\n", st->demod_accepted[0]);
        for (j = 1; j <= Modes.nfix_crc; ++j)
            printf("    %u accepted with %d-bit error repaired\n", st->demod_accepted[j], j);

        if (st->noise_power_sum > 0 && st->noise_power_count > 0) {
            printf("  %.1f dBFS noise power\n",
                    10 * log10(st->noise_power_sum / st->noise_power_count));
        }

        if (st->signal_power_sum > 0 && st->signal_power_count > 0) {
            printf("  %.1f dBFS mean signal power\n",
                    10 * log10(st->signal_power_sum / st->signal_power_count));
        }

        if (st->peak_signal_power > 0) {
            printf("  %.1f dBFS peak signal power\n",
                    10 * log10(st->peak_signal_power));
        }

        printf("  %u messages with signal power above -3dBFS\n",
                st->strong_signal_count);
    }

    if (Modes.net) {
        printf("Messages from network clients:\n");
        printf("  %u Mode A/C messages received\n", st->remote_received_modeac);
        printf("  %u Mode S messages received\n", st->remote_received_modes);
        printf("    %u with bad message format or invalid CRC\n", st->remote_rejected_bad);
        printf("    %u with unrecognized ICAO address\n", st->remote_rejected_unknown_icao);
        printf("    %u accepted with correct CRC\n", st->remote_accepted[0]);
        for (j = 1; j <= Modes.nfix_crc; ++j)
            printf("    %u accepted with %d-bit error repaired\n", st->remote_accepted[j], j);
    }

    printf("%u total usable messages\n",
            st->messages_total);

    printf("%u surface position messages received\n"
            "%u airborne position messages received\n"
            "%u global CPR attempts with valid positions\n"
            "%u global CPR attempts with bad data\n"
            "  %u global CPR attempts that failed the range check\n"
            "  %u global CPR attempts that failed the speed check\n"
            "%u global CPR attempts with insufficient data\n"
            "%u local CPR attempts with valid positions\n"
            "  %u aircraft-relative positions\n"
            "  %u receiver-relative positions\n"
            "%u local CPR attempts that did not produce useful positions\n"
            "  %u local CPR attempts that failed the range check\n"
            "  %u local CPR attempts that failed the speed check\n"
            "%u CPR messages that look like transponder failures filtered\n",
            st->cpr_surface,
            st->cpr_airborne,
            st->cpr_global_ok,
            st->cpr_global_bad,
            st->cpr_global_range_checks,
            st->cpr_global_speed_checks,
            st->cpr_global_skipped,
            st->cpr_local_ok,
            st->cpr_local_aircraft_relative,
            st->cpr_local_receiver_relative,
            st->cpr_local_skipped,
            st->cpr_local_range_checks,
            st->cpr_local_speed_checks,
            st->cpr_filtered);

    printf("%u non-ES altitude messages from ES-equipped aircraft ignored\n", st->suppressed_altitude_messages);
    printf("%u unique aircraft tracks\n", st->unique_aircraft);
    printf("%u aircraft tracks where only one message was seen\n", st->single_message_aircraft);
    printf("%u aircraft with positions seen\n", st->with_positions);
    printf("%u aircraft had an MLAT postion source\n", st->mlat_positions);
    printf("%u aircraft had an TISB position source\n", st->tisb_positions);

    {
        uint64_t demod_cpu_millis = (uint64_t) st->demod_cpu.tv_sec * 1000UL + st->demod_cpu.tv_nsec / 1000000UL;
        uint64_t reader_cpu_millis = (uint64_t) st->reader_cpu.tv_sec * 1000UL + st->reader_cpu.tv_nsec / 1000000UL;
        uint64_t background_cpu_millis = (uint64_t) st->background_cpu.tv_sec * 1000UL + st->background_cpu.tv_nsec / 1000000UL;

        printf("CPU load: %.1f%%\n"
                "  %llu ms for demodulation\n"
                "  %llu ms for reading from USB\n"
                "  %llu ms for network input and background tasks\n",
                100.0 * (demod_cpu_millis + reader_cpu_millis + background_cpu_millis) / (st->end - st->start + 1),
                (unsigned long long) demod_cpu_millis,
                (unsigned long long) reader_cpu_millis,
                (unsigned long long) background_cpu_millis);
    }

    fflush(stdout);
}

void reset_stats(struct stats *st) {
    static struct stats st_zero;
    *st = st_zero;
}

void add_stats(const struct stats *st1, const struct stats *st2, struct stats *target) {
    int i;

    if (st1->start == 0)
        target->start = st2->start;
    else if (st2->start == 0)
        target->start = st1->start;
    else if (st1->start < st2->start)
        target->start = st1->start;
    else
        target->start = st2->start;

    target->end = st1->end > st2->end ? st1->end : st2->end;

    target->demod_preambles = st1->demod_preambles + st2->demod_preambles;
    target->demod_rejected_bad = st1->demod_rejected_bad + st2->demod_rejected_bad;
    target->demod_rejected_unknown_icao = st1->demod_rejected_unknown_icao + st2->demod_rejected_unknown_icao;
    for (i = 0; i < MODES_MAX_BITERRORS + 1; ++i)
        target->demod_accepted[i] = st1->demod_accepted[i] + st2->demod_accepted[i];
    target->demod_modeac = st1->demod_modeac + st2->demod_modeac;

    target->samples_processed = st1->samples_processed + st2->samples_processed;
    target->samples_dropped = st1->samples_dropped + st2->samples_dropped;

    add_timespecs(&st1->demod_cpu, &st2->demod_cpu, &target->demod_cpu);
    add_timespecs(&st1->reader_cpu, &st2->reader_cpu, &target->reader_cpu);
    add_timespecs(&st1->background_cpu, &st2->background_cpu, &target->background_cpu);

    // noise power:
    target->noise_power_sum = st1->noise_power_sum + st2->noise_power_sum;
    target->noise_power_count = st1->noise_power_count + st2->noise_power_count;

    // mean signal power:
    target->signal_power_sum = st1->signal_power_sum + st2->signal_power_sum;
    target->signal_power_count = st1->signal_power_count + st2->signal_power_count;

    // peak signal power seen
    if (st1->peak_signal_power > st2->peak_signal_power)
        target->peak_signal_power = st1->peak_signal_power;
    else
        target->peak_signal_power = st2->peak_signal_power;

    // strong signals
    target->strong_signal_count = st1->strong_signal_count + st2->strong_signal_count;

    // remote messages:
    target->remote_received_modeac = st1->remote_received_modeac + st2->remote_received_modeac;
    target->remote_received_modes = st1->remote_received_modes + st2->remote_received_modes;
    target->remote_rejected_bad = st1->remote_rejected_bad + st2->remote_rejected_bad;
    target->remote_rejected_unknown_icao = st1->remote_rejected_unknown_icao + st2->remote_rejected_unknown_icao;
    for (i = 0; i < MODES_MAX_BITERRORS + 1; ++i)
        target->remote_accepted[i] = st1->remote_accepted[i] + st2->remote_accepted[i];

    // total messages:
    target->messages_total = st1->messages_total + st2->messages_total;

    // CPR decoding:
    target->cpr_surface = st1->cpr_surface + st2->cpr_surface;
    target->cpr_airborne = st1->cpr_airborne + st2->cpr_airborne;
    target->cpr_global_ok = st1->cpr_global_ok + st2->cpr_global_ok;
    target->cpr_global_bad = st1->cpr_global_bad + st2->cpr_global_bad;
    target->cpr_global_skipped = st1->cpr_global_skipped + st2->cpr_global_skipped;
    target->cpr_global_range_checks = st1->cpr_global_range_checks + st2->cpr_global_range_checks;
    target->cpr_global_speed_checks = st1->cpr_global_speed_checks + st2->cpr_global_speed_checks;
    target->cpr_local_ok = st1->cpr_local_ok + st2->cpr_local_ok;
    target->cpr_local_aircraft_relative = st1->cpr_local_aircraft_relative + st2->cpr_local_aircraft_relative;
    target->cpr_local_receiver_relative = st1->cpr_local_receiver_relative + st2->cpr_local_receiver_relative;
    target->cpr_local_skipped = st1->cpr_local_skipped + st2->cpr_local_skipped;
    target->cpr_local_range_checks = st1->cpr_local_range_checks + st2->cpr_local_range_checks;
    target->cpr_local_speed_checks = st1->cpr_local_speed_checks + st2->cpr_local_speed_checks;
    target->cpr_filtered = st1->cpr_filtered + st2->cpr_filtered;

    target->suppressed_altitude_messages = st1->suppressed_altitude_messages + st2->suppressed_altitude_messages;

    // aircraft
    target->unique_aircraft = st1->unique_aircraft + st2->unique_aircraft;
    target->single_message_aircraft = st1->single_message_aircraft + st2->single_message_aircraft;
    // Positions, momentary snapshot of track count. Sum up will cause false numbers.
    target->with_positions = st1->with_positions;
    target->mlat_positions = st1->mlat_positions;
    target->tisb_positions = st1->tisb_positions;

    // Longest Distance observed
    if (st1->longest_distance > st2->longest_distance)
        target->longest_distance = st1->longest_distance;
    else
        target->longest_distance = st2->longest_distance;
}
