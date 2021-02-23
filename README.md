# Readsb

[Portmanteau of *Read ADSB*]

Readsb is a Mode-S/ADSB/TIS decoder for RTLSDR, BladeRF, Modes-Beast and GNS5894 devices.
As a former fork of [dump1090-fa](https://github.com/flightaware/dump1090) it is using that code base
but development will continue as a standalone project with new name. Readsb can co-exist on the same
host system with dump1090-fa, it doesn't use or modify its resources. However both programs will not
share a receiver device at the same time and in parallel.

This version uses Googles protocol buffer for data storage and exchange with web application.
Saves up to 70% in storage space and bandwidth.

###### Disclaimer
This is a personal, hobbyist project with no commercial background.

### Warning

:exclamation: **This version of readsb is not compatible with any prior version.**

:exclamation: **This version of readsb is not compatible with any third party software or script that requires JSON output for statistical or aircraft data.**

### Push server support

readsb tries to connect to a listening server, like a push server.

For example feeding adsbexchange.com use the parameters:
```
--net-connector feed.adsbexchange.com,30005,beast_out
```

### BeastReduce output

Selectively forwards beast messages if the received data hasn't been forwarded in the last 125 ms (or `--net-beast-reduce-interval`).
Data not related to the physical aircraft state are only forwarded every 500 ms (4 * `--net-beast-reduce-interval`).The messages of
this output are normal beast messages and compatible with every program able to receive beast messages.

## readsb Debian/Raspbian/Ubuntu packages

See [INSTALL](INSTALL.md) for installation and build process.
