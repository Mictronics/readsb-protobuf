// Part of readsb, a Mode-S/ADSB/TIS message decoder.
//
// track.h: aircraft state tracking prototypes
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

#ifndef UTIL_H
#define UTIL_H

#include <stdint.h>

/* Returns system time in milliseconds */
uint64_t mstime(void);

/* Returns the time for the current message we're dealing with */
extern uint64_t _messageNow;

static inline uint64_t
messageNow() {
    return _messageNow;
}

/* Returns the time elapsed, in nanoseconds, from t1 to t2,
 * where t1 and t2 are 12MHz counters.
 */
int64_t receiveclock_ns_elapsed(uint64_t t1, uint64_t t2);

/* Same, in milliseconds */
int64_t receiveclock_ms_elapsed(uint64_t t1, uint64_t t2);

/* Normalize the value in ts so that ts->nsec lies in
 * [0,999999999]
 */
struct timespec;
void normalize_timespec(struct timespec *ts);

/* Find the absolute system time that is `timeout_ms` milliseconds in the future, and store that in *ts */
void get_deadline(uint32_t timeout_ms, struct timespec *ts);

/* record current CPU time in start_time */
void start_cpu_timing(struct timespec *start_time);

/* add difference between start_time and the current CPU time to add_to, return elapsed time */
int64_t end_cpu_timing(const struct timespec *start_time, struct timespec *add_to);

/* like end_cpu_timing followed by start_cpu_timing, but without a gap */
void update_cpu_timing(struct timespec *start_time, struct timespec *add_to);

/* set current thread name, if supported */
void set_thread_name(const char *name);

#endif
