// Part of readsb, a Mode-S/ADSB/TIS message decoder.
//
// readsbrrd.c: Readsb Round Robin Database statistics collector.
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

#include "readsbrrd.h"
#include "readsb.pb-c.h"

static int readsbrrd_exit = 0;
static uint8_t *read_buf;
static error_t parse_opt(int key, char *arg, struct argp_state *state);
const char *argp_program_version = "readsbrrd v1.0.0";
const char doc[] = "readsbrrd - Readsb Round Robin Database statistics collector.";
const char args_doc[] = "";
static struct argp argp = {options, parse_opt, args_doc, doc, NULL, NULL, NULL};
static sem_t* stats_semptr = NULL;

/*
 * Order and file names must correspond with rrd_file_type_t.
 */
static struct {
    const char *name;
    const char *ds;
} rrd_files[] = {
    {"dbfs_signal.rrd", "DS:value:GAUGE:%d:U:0"},
    {"dbfs_noise.rrd", "DS:value:GAUGE:%d:U:0"},
    {"dbfs_min_signal.rrd", "DS:value:GAUGE:%d:U:0"},
    {"dbfs_quart1.rrd", "DS:value:GAUGE:%d:U:0"},
    {"dbfs_median.rrd", "DS:value:GAUGE:%d:U:0"},
    {"dbfs_quart3.rrd", "DS:value:GAUGE:%d:U:0"},
    {"dbfs_max_signal.rrd", "DS:value:GAUGE:%d:U:0"},
    {"messages_local_accepted.rrd", "DS:value:DERIVE:%d:0:U"},
    {"messages_remote_accepted.rrd", "DS:value:DERIVE:%d:0:U"},
    {"messages_strong_signals.rrd", "DS:value:DERIVE:%d:0:U"},
    {"messages_positions.rrd", "DS:value:DERIVE:%d:0:U"},
    {"tracks_all.rrd", "DS:value:DERIVE:%d:0:U"},
    {"tracks_single_message.rrd", "DS:value:DERIVE:%d:0:U"},
    {"cpu_demod.rrd", "DS:value:DERIVE:%d:0:U"},
    {"cpu_reader.rrd", "DS:value:DERIVE:%d:0:U"},
    {"cpu_background.rrd", "DS:value:DERIVE:%d:0:U"},
    {"range_min.rrd", "DS:value:GAUGE:%d:0:U"},
    {"range_quart1.rrd", "DS:value:GAUGE:%d:0:U"},
    {"range_median.rrd", "DS:value:GAUGE:%d:0:U"},
    {"range_quart3.rrd", "DS:value:GAUGE:%d:0:U"},
    {"range_max.rrd", "DS:value:GAUGE:%d:0:U"},
    {"aircraft_total.rrd", "DS:value:GAUGE:%d:0:U"},
    {"aircraft_positions.rrd", "DS:value:GAUGE:%d:0:U"},
    {"aircraft_mlat.rrd", "DS:value:GAUGE:%d:0:U"},
    {"aircraft_tisb.rrd", "DS:value:GAUGE:%d:0:U"},
    {"aircraft_gps.rrd", "DS:value:GAUGE:%d:0:U"},
    {"memory-total.rrd", "DS:value:GAUGE:%d:0:281474976710656"},
    {"memory-free.rrd", "DS:value:GAUGE:%d:0:281474976710656"},
    {"memory-used.rrd", "DS:value:GAUGE:%d:0:281474976710656"},
    {"memory-cached.rrd", "DS:value:GAUGE:%d:0:281474976710656"},
    {"memory-buffered.rrd", "DS:value:GAUGE:%d:0:281474976710656"},
    {NULL, NULL}
};

const char *rra[] = {
    // 1 day, 1 minute resolution
    "RRA:AVERAGE:0.5:1:1440",
    "RRA:MAX:0.5:1:1440",
    "RRA:MIN:0.5:1:1440",
    // 7 days, 15 minutes resolution
    "RRA:AVERAGE:0.5:15:672",
    "RRA:MAX:0.5:15:672",
    "RRA:MIN:0.5:15:672",
    // 1 month, 60 minutes resolution
    "RRA:AVERAGE:0.5:60:744",
    "RRA:MAX:0.5:60:744",
    "RRA:MIN:0.5:60:744",
    // 1 year, 6 hours resolution
    "RRA:AVERAGE:0.5:360:1460",
    "RRA:MAX:0.5:360:1460",
    "RRA:MIN:0.5:360:1460",
    NULL
};

static rrd_struct rrd;

/**
 * Signal handler
 * @param sig Signal number we got.
 */
static void signal_handler(int sig) {
    signal(sig, SIG_DFL); // Reset signal handler
    readsbrrd_exit = 1;
    fprintf(stderr, "caught signal %s, shutting down..\n", strsignal(sig));
}

/**
 * Command line option parser.
 * @param key Option key.
 * @param argc number of command line arguments.
 * @param argv command line arguments.
 * @param state PArsing state.
 * @return Command line options have error, or not.
 */
static error_t parse_opt(int key, char *arg, struct argp_state *state) {
    switch (key) {
        case OPT_RRD_DIR:
            rrd.path = strndup(arg, PATH_MAX);
            break;
        case OPT_RRD_STEP:
            rrd.step = (uint32_t) strtol(arg, NULL, 10);
            if (rrd.step == 0) {
                rrd.step = DS_STEP;
            }
            break;
        case ARGP_KEY_END:
            if (state->arg_num > 0)
                /* We use only options but no arguments */
                argp_usage(state);
            break;
        default:
            return ARGP_ERR_UNKNOWN;
    }
    return 0;
}

/**
 * Clean up before program exit.
 * @param code Exit code.
 */
static void cleanup_and_exit(int code) {
    sem_close(stats_semptr);
    free(rrd.path);
    for (int i = 0; i < MAX_RRD_ARGV; i++)
        free(rrd.argv[i]);
    exit(code);
}

/**
 * Parse content of /proc/meminfo.
 * @param name Name of value to get.
 * @param buf Meminfo output.
 * @return Value of name
 */
static long get_meminfo_entry(const char* name, const char* buf) {
    char* hit = strstr(buf, name);
    if (hit == NULL) {
        return -1;
    }

    errno = 0;
    long val = strtol(hit + strlen(name) + 1, NULL, 10);
    if (errno != 0) {
        fprintf(stderr, "cannot get meminfo entry %s: strtol() failed\n", name);
        return -1;
    }
    return val;
}

/**
 * Init rrd structure.
 */
static void rrd_init() {
    int i;

    rrd.path = strdup(DEFAULT_RRD_PATH);
    rrd.status = 0;
    rrd.time_update = 0;
    rrd.step = DS_STEP;
    for (i = 0; i < MAX_RRD_ARGV; i++) {
        rrd.argv[i] = (char *) malloc(256);
    }
    // Special case for path and file name
    free(rrd.argv[1]);
    rrd.argv[1] = (char *) malloc(PATH_MAX);
}

/**
 * Create rrd files but not overwrite if existing.
 * @return Status.
 */
static int rrd_create_files() {
    struct stat st;

    if (!((stat(rrd.path, &st) == 0) && S_ISDIR(st.st_mode))) {
        fprintf(stderr, "cannot create rrd files in '%s': no such directory\n", rrd.path);
        return -1;
    }

    for (int f = 0; rrd_files[f].name; ++f) {
        rrd.argc = 0;
        snprintf(rrd.argv[0], 256, "create");
        rrd.argc += 1;
        snprintf(rrd.argv[1], PATH_MAX, "%s/%s", rrd.path, rrd_files[f].name);
        rrd.argc += 1;
        snprintf(rrd.argv[2], 256, "--step");
        rrd.argc += 1;
        snprintf(rrd.argv[3], 256, "%d", rrd.step);
        rrd.argc += 1;
        snprintf(rrd.argv[4], 256, "--no-overwrite");
        rrd.argc += 1;
        snprintf(rrd.argv[5], 256, rrd_files[f].ds, rrd.step * 2);
        rrd.argc += 1;
        for (int r = 0; rra[r]; ++r) {
            if ((6 + r) > MAX_RRD_ARGV) {
                break;
            }
            snprintf(rrd.argv[6 + r], 256, "%s", rra[r]);
            rrd.argc += 1;
        }
        rrd.status = rrd_create(rrd.argc, rrd.argv);
        if (rrd_test_error()) {
            fprintf(stderr, "%s\n", rrd_get_error());
            rrd_clear_error();
        }
    }
    return 0;
}

/**
 * Update value in rrd file.
 * @param type Type of rrd file.
 * @param value Update value.
 */
static void rrd_update_file(rrd_file_type_t type, float value) {
    rrd.argc = 0;
    snprintf(rrd.argv[0], 256, "update");
    rrd.argc += 1;
    snprintf(rrd.argv[1], PATH_MAX, "%s/%s", rrd.path, rrd_files[type].name);
    rrd.argc += 1;
    snprintf(rrd.argv[2], 256, "%" PRIu64 ":%.0f", rrd.time_update, value);
    rrd.argc += 1;
    rrd.argv[3] = NULL;
    
    // System time must be at least one second in future than last RRD timestamp.
    if ((uint64_t)rrd_last_r(rrd.argv[1]) >= rrd.time_update) {
        fprintf(stderr, "error system time in past compared to last entry in %s.\n", rrd_files[type].name);
        return;
    }
    
    rrd.status = rrd_update(rrd.argc, rrd.argv);
    if (rrd_test_error()) {
        fprintf(stderr, "%s\n", rrd_get_error());
        rrd_clear_error();
    }
}

/**
 * Update rrd files with system informations.
 */
static void update_from_system() {
    // Read system memory info
    float mem_total = 0;
    float mem_cached = 0;
    float mem_free = 0;
    float mem_buffers = 0;
    float mem_used = 0;

    int fd = open("/proc/meminfo", O_RDONLY);
    if (fd == -1) {
        fprintf(stderr, "cannot open file /proc/meminfo: %s\n", strerror(errno));
        return;
    }

    // meminfo is about 1400 bytes on Linux, so should be enough for future.
    char *buf = (char *) malloc(4096);
    if (read(fd, buf, 4096) == 0) {
        fprintf(stderr, "cannot read file /proc/meminfo: %s\n", strerror(errno));
        close(fd);
        return;
    }
    close(fd);

    mem_total = 1024 * get_meminfo_entry("MemTotal", buf);
    mem_free = 1024 * get_meminfo_entry("MemFree", buf);
    mem_buffers = 1024 * get_meminfo_entry("Buffers", buf);
    mem_cached = 1024 * (get_meminfo_entry("Cached", buf) + get_meminfo_entry("SReclaimable", buf) - get_meminfo_entry("Shmem", buf));
    mem_used = mem_total - mem_free - mem_buffers - mem_cached;

    rrd_update_file(MEM_TOTAL, mem_total);
    rrd_update_file(MEM_FREE, mem_free);
    rrd_update_file(MEM_BUFFERED, mem_buffers);
    rrd_update_file(MEM_CACHED, mem_cached);
    rrd_update_file(MEM_USED, mem_used);

    free(buf);
}

/**
 * Read and process readsb stats.pb file.
 * @param file_name Absolute path and file name.
 */
static void update_from_stats(const char *file_name) {
    struct stat st;
    off_t file_size = 0;
    Statistics *stats_msg;

    if (stat(file_name, &st) == 0) {
        file_size = st.st_size;
    } else {
        fprintf(stderr, "cannot determine size of %s: %s\n", file_name, strerror(errno));
        return;
    }

    int fd = open(file_name, O_RDONLY);
    if (fd == -1) {
        fprintf(stderr, "cannot open file %s: %s\n", file_name, strerror(errno));
        return;
    }

    read_buf = (uint8_t *) malloc(file_size);
    if (read_buf == NULL) {
        fprintf(stderr, "unable to allocated read buffer for %s\n", file_name);
        close(fd);
        return;
    }

    file_size = read(fd, read_buf, file_size);
    close(fd);

    if (file_size == 0) {
        return;
    }

    stats_msg = statistics__unpack(NULL, file_size, read_buf);
    free(read_buf);
    if (stats_msg == NULL) {
        fprintf(stderr, "unpacking statistics message failed\n");
        return;
    }

    // Overwrite update time from stats entry if exists, otherwise use unix epoch.
    rrd.time_update = stats_msg->last_1min->stop;
    rrd_update_file(DBFS_SIGNAL, (float) (stats_msg->last_1min->local_signal));
    rrd_update_file(DBFS_NOISE, (float) (stats_msg->last_1min->local_noise));
    rrd_update_file(MSG_STRONG_SIGNALS, stats_msg->total->local_strong_signals);
    rrd_update_file(MSG_POSITIONS, (float) (stats_msg->total->cpr_local_ok + stats_msg->total->cpr_global_ok));
    rrd_update_file(TRACKS_ALL, (float) (stats_msg->total->tracks_new));
    rrd_update_file(TRACKS_SINGLE_MSG, (float) (stats_msg->total->tracks_single_message));
    rrd_update_file(CPU_DEMOD, (float) (stats_msg->total->cpu_demod));
    rrd_update_file(CPU_READER, (float) (stats_msg->total->cpu_reader));
    rrd_update_file(CPU_BACKGROUND, (float) (stats_msg->total->cpu_background));
    rrd_update_file(MSG_LOCAL_ACCEPTED, (float) (stats_msg->total->local_accepted));
    rrd_update_file(MSG_REMOTE_ACCEPTED, (float) (stats_msg->total->remote_accepted));

    statistics__free_unpacked(stats_msg, NULL);
}

/**
 * Compare two float numbers for qsort.
 * @param a First float number.
 * @param b Second float number.
 * @return Comparision result.
 */
static int compare_float(const void* a, const void* b) {
    float val_a = *((float*) a);
    float val_b = *((float*) b);

    if (val_a == val_b) return 0;
    else if (val_a < val_b) return -1;
    else return 1;
}

/**
 * Caluclate given percentile from array of floats.
 * @param p Percentile to calculate, range 0-1.
 * @param values Array of float numbers.
 * @param l Length of array.
 * @return The percentile.
 */
static float percentile(float p, float* values, size_t l) {
    float res = 0.0f;
    float x = p * (l - 1);
    float d = x - (int) x;
    unsigned y = (unsigned) x;
    if (y + 1 < l) {
        res = values[y] + d * (values[y + 1] - values[y]);
    } else {
        res = values[y];
    }
    return res;
}

/**
 * Read and process readsb aircraft.pb file.
 * @param file_name Absolute path and file name.
 */
static void update_from_aircrafts(const char* file_name) {
    struct stat st;
    off_t file_size = 0;
    float min = 0;
    float quart1 = 0;
    float median = 0;
    float quart3 = 0;
    float max = 0;
    float ac_total = 0;
    float ac_with_pos = 0;
    float ac_mlat = 0;
    float ac_tisb = 0;
    float ac_gps = 0;
    uint64_t seen = 0;
    size_t n_aircraft = 0;
    float *signals;
    float *distances;
    AircraftsUpdate *aircrafts_msg;

    if (stat(file_name, &st) == 0) {
        file_size = st.st_size;
    } else {
        fprintf(stderr, "cannot determine size of %s: %s\n", file_name, strerror(errno));
        return;
    }

    int fd = open(file_name, O_RDONLY);
    if (fd == -1) {
        fprintf(stderr, "cannot open file %s: %s\n", file_name, strerror(errno));
        return;
    }

    read_buf = (uint8_t *) malloc(file_size);
    if (read_buf == NULL) {
        fprintf(stderr, "unable to allocated read buffer for %s\n", file_name);
        close(fd);
        return;
    }

    file_size = read(fd, read_buf, file_size);
    close(fd);
    if (file_size == 0) {
        return;
    }

    aircrafts_msg = aircrafts_update__unpack(NULL, file_size, read_buf);
    free(read_buf);
    if (aircrafts_msg == NULL) {
        fprintf(stderr, "unpacking statistics message failed\n");
        return;
    }

    // Overwrite update time from aircraft.pb if exists, otherwise use unix epoch.
    rrd.time_update = aircrafts_msg->now;
    n_aircraft = aircrafts_msg->n_aircraft;

    if (n_aircraft > 0) {
        signals = calloc(n_aircraft, sizeof (float));
        distances = calloc(n_aircraft, sizeof (uint32_t));
        if (signals == NULL) {
            fprintf(stderr, "failed to allocated memory for signal stats\n");
            free(distances);
            aircrafts_update__free_unpacked(aircrafts_msg, NULL);
            return;
        }

        if (distances == NULL) {
            fprintf(stderr, "failed to allocated memory for distance stats\n");
            free(signals);
            aircrafts_update__free_unpacked(aircrafts_msg, NULL);
            return;
        }

        for (size_t a = 0; a < n_aircraft; a++) {
            // Get signal RSSI.
            seen = (rrd.time_update - (aircrafts_msg->aircraft[a]->seen / 1000));
            if ((aircrafts_msg->aircraft[a]->messages > 3) && (seen < 30) && (aircrafts_msg->aircraft[a]->rssi > -50.0)) {
                signals[a] = aircrafts_msg->aircraft[a]->rssi;
            }
            // Get distances.
            distances[a] = (float) aircrafts_msg->aircraft[a]->distance;

            // Count total number of aircrafts and with valid position.
            if (seen < 30) {
                ac_total += 1;
            }

            if ((aircrafts_msg->aircraft[a]->seen_pos < 30)) {
                ac_with_pos += 1;
            }

            // Count aircraft source type.
            if (aircrafts_msg->aircraft[a]->valid_source != NULL) {
                if (aircrafts_msg->aircraft[a]->valid_source->lat == SOURCE_MLAT) {
                    ac_mlat += 1;
                } else if (aircrafts_msg->aircraft[a]->valid_source->lat == SOURCE_TISB) {
                    ac_tisb += 1;
                } else {
                    ac_gps += 1;
                }
            }
        }

        aircrafts_update__free_unpacked(aircrafts_msg, NULL);
        // Sort signals and distances ascending.
        qsort(signals, n_aircraft, sizeof (float), compare_float);
        qsort(distances, n_aircraft, sizeof (float), compare_float);

        // Calculate signal statistics
        min = signals[0];
        quart1 = percentile(0.25f, signals, n_aircraft);
        median = percentile(0.50f, signals, n_aircraft);
        quart3 = percentile(0.75f, signals, n_aircraft);
        max = signals[n_aircraft - 1];

        rrd_update_file(DBFS_MIN_SIGNAL, min);
        rrd_update_file(DBFS_QUART1, quart1);
        rrd_update_file(DBFS_MEDIAN, median);
        rrd_update_file(DBFS_QUART3, quart3);
        rrd_update_file(DBFS_MAX_SIGNAL, max);

        // Calculate distance statistics
        min = distances[0];
        quart1 = percentile(0.25f, distances, n_aircraft);
        median = percentile(0.50f, distances, n_aircraft);
        quart3 = percentile(0.75f, distances, n_aircraft);
        max = distances[n_aircraft - 1];

        rrd_update_file(RANGE_MIN, min);
        rrd_update_file(RANGE_QUART1, quart1);
        rrd_update_file(RANGE_MEDIAN, median);
        rrd_update_file(RANGE_QUART3, quart3);
        rrd_update_file(RANGE_MAX, max);

        free(signals);
        free(distances);
    }

    rrd_update_file(AIRCRAFT_TOTAL, ac_total);
    rrd_update_file(AIRCRAFT_POSITIONS, ac_with_pos);
    rrd_update_file(AIRCRAFT_MLAT, ac_mlat);
    rrd_update_file(AIRCRAFT_TISB, ac_tisb);
    rrd_update_file(AIRCRAFT_GPS, ac_gps);
}

/**
 * This is readsbrrd.
 * @param argc Start arguments count.
 * @param argv Start arguments.
 * @return 
 */
int main(int argc, char** argv) {
    struct timespec ts;
    int semcnt, r;
    char stats_file_path[PATH_MAX];
    char aircrafts_file_path[PATH_MAX];
    snprintf(stats_file_path, PATH_MAX, "%s/stats.pb", DEFAULT_READSB_RUN_PATH);
    snprintf(aircrafts_file_path, PATH_MAX, "%s/aircraft.pb", DEFAULT_READSB_RUN_PATH);

    // signal handlers:
    signal(SIGINT, signal_handler);
    signal(SIGTERM, signal_handler);
    signal(SIGABRT, signal_handler);

    rrd_init();

    // Parse the command line options
    if (argp_parse(&argp, argc, argv, 0, 0, 0)) {
        cleanup_and_exit(2);
    }

    // Create rrd files if they not exist, we do not overwrite.
    if (rrd_create_files() != 0) {
        cleanup_and_exit(4);
    }

    stats_semptr = sem_open("/readsbStatsTrigger", O_CREAT, 0644, 0);
    if (stats_semptr == SEM_FAILED) {
        fprintf(stderr, "error creating stats semaphore: %s\n", strerror(errno));
        cleanup_and_exit(4);
    }

    // Run this until we get a termination signal.
    while (!readsbrrd_exit) {
        clock_gettime(CLOCK_REALTIME, &ts);
        ts.tv_sec += (__time_t) (rrd.step * 1.5);
        r = sem_getvalue(stats_semptr, &semcnt);
        // Avoid frequent updates when more than one event is queued in semaphore.
        // Update only one very last event.
        if (r == 0 && semcnt == 0) {
            // Get update time as unix epoch
            rrd.time_update = (uint64_t)time(NULL);
            update_from_system();
            update_from_stats(stats_file_path);
            update_from_aircrafts(aircrafts_file_path);
        }
        // Wait for new statistic from readsb process, or read anyway on timeout.
        r = sem_timedwait(stats_semptr, &ts);
        if (r != 0) {
            fprintf(stderr, "error sem_timedwait: %s, semcnt: %d\n", strerror(errno), semcnt);
        }
    }

    cleanup_and_exit(EXIT_SUCCESS);
    return (EXIT_SUCCESS);
}
