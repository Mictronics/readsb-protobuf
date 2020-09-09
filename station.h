#ifndef READSB_STATION_H
#define READSB_STATION_H

#include "readsb.h"
#include "net_io.h"
#include "stats.h"
#include "cpr.h"
#include "convert.h"
#include "sdr.h"
#include "readsb.pb-c.h"
#include <stdatomic.h>
#include <semaphore.h>

void receiverPositionChanged (float lat, float lon, float alt);

typedef enum {
    SDR_NONE = 0, SDR_IFILE, SDR_RTLSDR, SDR_BLADERF, SDR_MICROBLADERF, SDR_MODESBEAST, SDR_PLUTOSDR, SDR_GNS
} sdr_type_t;

// Program global state

struct _Modes { // Internal state
    pthread_t reader_thread;
    unsigned trailing_samples; // extra trailing samples in magnitude buffers
    atomic_int exit; // Exit from the main loop when true
    int8_t dc_filter; // should we apply a DC filter?
    uint32_t show_only; // Only show messages from this ICAO
    int fd; // --ifile option file descriptor
    input_format_t input_format; // --iformat option
    iq_convert_fn converter_function;
    char * dev_name;
    int gain;
    int enable_agc;
    sdr_type_t sdr_type; // where are we getting data from?
    int freq;
    int ppm_error;
    char aneterr[ANET_ERR_LEN];
    int beast_fd; // Local Modes-S Beast handler
    struct net_service *services; // Active services
    struct aircraft *aircrafts[AIRCRAFTS_BUCKETS];
    struct net_writer raw_out; // Raw output
    struct net_writer beast_out; // Beast-format output
    struct net_writer beast_reduce_out; // Reduced data Beast-format output
    struct net_writer sbs_out; // SBS-format output
    struct net_writer vrs_out; // SBS-format output
    struct net_writer fatsv_out; // FATSV-format output
    sem_t* stats_semptr; // Statistics semaphore to syncronize with readsbrrd

    // Configuration
    Receiver receiver; // Receiver configuration
    int8_t nfix_crc; // Number of crc bit error(s) to correct
    int8_t check_crc; // Only display messages with good CRC
    int8_t raw; // Raw output format
    int8_t mode_ac; // Enable decoding of SSR Modes A & C
    int8_t mode_ac_auto; // allow toggling of A/C by Beast commands
    int8_t net; // Enable networking
    int8_t net_only; // Enable just networking
    int net_output_flush_size; // Minimum Size of output data
    uint32_t net_connector_delay;
    int filter_persistence; // Maximum number of consecutive implausible positions from global CPR to invalidate a known position.
    uint32_t net_heartbeat_interval; // TCP heartbeat interval (milliseconds)
    uint32_t net_output_flush_interval; // Maximum interval (in milliseconds) between outputwrites
    double maxRange; // Absolute maximum decoding range, in *metres*
    double sample_rate; // actual sample rate in use (in hz)
    uint32_t interactive_display_ttl; // Interactive mode: TTL display
    uint64_t stats; // Interval (millis) between stats dumps,
    uint32_t output_interval; // Interval between rewriting the aircraft file, in milliseconds; also the advertised map refresh interval
    char *net_output_raw_ports; // List of raw output TCP ports
    char *net_input_raw_ports; // List of raw input TCP ports
    char *net_output_sbs_ports; // List of SBS output TCP ports
    char *net_input_sbs_ports; // List of SBS input TCP ports
    char *net_input_beast_ports; // List of Beast input TCP ports
    char *net_output_beast_ports; // List of Beast output TCP ports
    char *net_output_beast_reduce_ports; // List of Beast output TCP ports
    uint32_t net_output_beast_reduce_interval; // Position update interval for data reduction
    char *net_output_vrs_ports; // List of VRS output TCP ports
    int8_t basestation_is_mlat; // Basestation input is from MLAT
    struct net_connector **net_connectors; // client connectors
    int net_connectors_count;
    int net_connectors_size;
    char *filename; // Input form file, --ifile option
    char *net_bind_address; // Bind address
    char *output_dir; // Path to output base directory, or NULL not to write any output.
    char *beast_serial; // Modes-S Beast device path
    int net_sndbuf_size; // TCP output buffer size (64Kb * 2^n)
    int8_t net_verbatim; // if true, send the original message, not the CRC-corrected one
    int8_t forward_mlat; // allow forwarding of mlat messages to output ports
    int8_t quiet; // Suppress stdout
    int8_t interactive; // Interactive mode
    int8_t stats_polar_range; // Collect/show a range histogram?
    int8_t onlyaddr; // Print only ICAO addresses
    int8_t metric; // Use metric units
    int8_t use_gnss; // Use GNSS altitudes with H suffix ("HAE", though it isn't always) when available
    int8_t mlat; // Use Beast ascii format for raw data output, i.e. @...; iso *...;
    int8_t rx_location_accuracy; // Accuracy of location metadata: 0=none, 1=approx, 2=exact
    int aircraft_history_next;
    int aircraft_history_full;
    int stats_latest_1min;
    int bUserFlags; // Flags relating to the user details
    int8_t biastee;
    struct stats stats_current;
    struct stats stats_alltime;
    struct stats stats_periodic;
    struct stats stats_1min[15];
    struct stats stats_5min;
    struct stats stats_15min;
    struct range_stats stats_range;
    struct timespec reader_cpu_accumulator; // accumulated CPU time used by the reader thread
    struct timespec reader_cpu_start; // start time for the last reader thread CPU measurement
    pthread_mutex_t reader_cpu_mutex; // mutex protecting reader_cpu_accumulator
};

extern struct _Modes Modes;

#endif //READSB_STATION_H
