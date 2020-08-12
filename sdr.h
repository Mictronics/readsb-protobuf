// Part of readsb, a Mode-S/ADSB/TIS message decoder.
//
// sdr.h: generic SDR infrastructure (header)
//
// Copyright (c) 2020 Michael Wolf <michael@mictronics.de>
//
// This code is based on a detached fork of dump1090-fa.
//
// Copyright (c) 2016-2017 Oliver Jowett <oliver@mutability.co.uk>
// Copyright (c) 2017 FlightAware LLC
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

#ifndef SDR_H
#define SDR_H

// Common interface to different SDR inputs.

void sdrInitConfig();
bool sdrHandleOption(int argc, char *argv);
bool sdrOpen();
void sdrRun();
void sdrClose();
// Call periodically from the SDR read thread to update reader thread CPU stats:
void sdrMonitor();
// Retrieve CPU stats and add new CPU time to *addTo
void sdrUpdateCPUTime(struct timespec *addTo);

#endif
