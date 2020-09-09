// Part of readsb, a Mode-S/ADSB/TIS message decoder.
//
// mode_s.h: Mode S message decoding (header)
//
// Copyright (c) 2019 Michael Wolf <michael@mictronics.de>
//
// This code is based on a detached fork of dump1090-fa.
//
// Copyright (c) 2017 FlightAware, LLC
// Copyright (c) 2017 Oliver Jowett <oliver@mutability.co.uk>
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

#ifndef MODE_AC_H
#define MODE_AC_H

#include <assert.h>

#ifdef __cplusplus
extern "C" {
#endif

void decodeModeAMessage(struct modesMessage *mm, int ModeA);
unsigned modeCToModeA (int modeC);
int modeAToModeC (unsigned int modeA);
void modeACInit ();

#ifdef __cplusplus
}
#endif

#endif