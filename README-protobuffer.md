# Protocol buffer output formats

readsb generates several protocol buffer files with informaton about the receiver itself, currently known aircraft,
and general statistics. These are used by the webapp, but could also be used by other things feeds stats
about readsb operation to collectd for performance graphing.

## Reading the protocol buffer files

There are two ways to obtain the files:

 * By HTTP from the external webserver that readsb is feeding. The files are served from the data/ path, e.g. http://somehost/readsb/data/aircraft.pb
 * As a file in the directory specified by --write-output on readsb command line. Default location in /run/readsb

The HTTP versions are always up to date.
The file versions are written periodically; for aircraft, typically once a second, for stats, once a minute.
The file versions are updated to a temporary file, then atomically renamed to the right path, so you should never see partial copies.

Each file contains several protocol buffer messages, defined in readsb.proto. These files can be decoded using the protoc-c compiler.

e.g. ```protoc-c --decode=AircraftsUpdate readsb.proto < /run/readsb/aircraft.pb```
