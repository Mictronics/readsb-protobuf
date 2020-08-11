// Part of readsb, a Mode-S/ADSB/TIS message decoder.
//
// readsbrrd.c: Readsb Round Robin Database statistics collector. (header)
//
// Copyright (c) 2020 Michael Wolf <michael@mictronics.de>
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

#ifndef READSBRRD_H
#define READSBRRD_H

#include <stdio.h>
#include <stdlib.h>
#include <argp.h>
#include <signal.h>
#include <inttypes.h>
#include <sys/stat.h>
#include <rrd.h>
#include <limits.h>
#include <stdint.h>
#include <fcntl.h>
#include <errno.h>
#include <time.h>
#include <semaphore.h>

#define NOTUSED(V) ((void) V)

#define DS_STEP 60
#define DEFAULT_RRD_PATH "/var/lib/collectd/rrd/localhost/readsb"
#define DEFAULT_READSB_RUN_PATH "/run/readsb"

typedef enum {
    DBFS_SIGNAL = 0,
    DBFS_NOISE,
    DBFS_MIN_SIGNAL,
    DBFS_QUART1,
    DBFS_MEDIAN,
    DBFS_QUART3,
    DBFS_MAX_SIGNAL,
    MSG_LOCAL_ACCEPTED,
    MSG_REMOTE_ACCEPTED,
    MSG_STRONG_SIGNALS,
    MSG_POSITIONS,
    TRACKS_ALL,
    TRACKS_SINGLE_MSG,
    CPU_DEMOD,
    CPU_READER,
    CPU_BACKGROUND,
    RANGE_MIN,
    RANGE_QUART1,
    RANGE_MEDIAN,
    RANGE_QUART3,
    RANGE_MAX,
    AIRCRAFT_TOTAL,
    AIRCRAFT_POSITIONS,
    AIRCRAFT_MLAT,
    AIRCRAFT_TISB,
    AIRCRAFT_GPS,
    MEM_TOTAL,
    MEM_FREE,
    MEM_USED,
    MEM_CACHED,
    MEM_BUFFERED
} rrd_file_type_t;

enum {
    OPT_RRD_STEP = 700,
    OPT_RRD_DIR
};

/* Where did a bit of data arrive from? In order of increasing priority */
typedef enum {
    SOURCE_INVALID = 0, /* data is not valid */
    SOURCE_MODE_AC = 1, /* A/C message */
    SOURCE_MLAT = 2, /* derived from mlat */
    SOURCE_MODE_S = 3, /* data from a Mode S message, no full CRC */
    SOURCE_MODE_S_CHECKED = 4, /* data from a Mode S message with full CRC */
    SOURCE_TISB = 5, /* data from a TIS-B extended squitter message */
    SOURCE_ADSR = 6, /* data from a ADS-R extended squitter message */
    SOURCE_ADSB = 7, /* data from a ADS-B extended squitter message */
} datasource_t;

#define MAX_RRD_ARGV 20

typedef struct {
    uint64_t time_update;
    int status;
    unsigned step;
    int argc;
    char *argv[MAX_RRD_ARGV];
    char *path;
} rrd_struct;

const char *argp_program_bug_address = "https://github.com/Mictronics/readsb-protobuf";
static error_t parse_opt(int key, char *arg, struct argp_state *state);

static struct argp_option options[] = {
    {"rrd-step", OPT_RRD_STEP, "<sec>", 0, "Interval in seconds to feed data into RRD files", 1},
    {"rrd-dir", OPT_RRD_DIR, "<dir>", 0, "Write RRD files to path <dir>", 1},
    { 0}
};


#endif /* READSBRRD_H */
