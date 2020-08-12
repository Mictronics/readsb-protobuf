# Protocol buffer output formats

readsb generates several protocol buffer files with informaton about the receiver itself, currently known aircraft,
and general statistics. These are used by the webapp, but could also be used by other things feeds stats
about readsb operation to collectd for performance graphing.

readsb with protocol buffer output is not compatible with any prior version. It is not compatible with any third party software
or script that requires JSON output for statistical or aircraft data.

## Reading the protocol buffer files

There are two ways to obtain the files:

 * By HTTP from the external webserver that readsb is feeding. The files are served from the data/ path, e.g. http://somehost/radar/data/aircraft.pb
 * As a file in the directory specified by --write-output on readsb command line. Default location in /run/readsb

The HTTP versions are always up to date.
The file versions are written periodically; for aircraft, typically once a second, for stats, once a minute.
The file versions are updated to a temporary file, then atomically renamed to the right path, so you should never see partial copies.

Each file contains several protocol buffer messages, defined in readsb.proto. These files can be decoded using the protoc-c compiler.

```
protoc-c --decode=AircraftsUpdate readsb.proto < /run/readsb/aircraft.pb
protoc-c --decode=AircraftsUpdate readsb.proto < /run/readsb/history_5.pb
protoc-c --decode=Statistics readsb.proto < /run/readsb/stats.pb
protoc-c --decode=Receiver readsb.proto < /run/readsb/receiver.pb
```
