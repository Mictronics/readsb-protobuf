// Part of readsb, a Mode-S/ADSB/TIS message decoder.
//
// track.c: aircraft state tracking
//
// Copyright (c) 2020 Michael Wolf <michael@mictronics.de>
//
// This code is based on a detached fork of dump1090-fa.
//
// Copyright (c) 2014-2016 Oliver Jowett <oliver@mutability.co.uk>
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

#include "readsb.h"
#include "mode_ac.h"
#include "geomag.h"
#include "station.h"
#include "track.h"
#include <inttypes.h>
#include <math.h>
#include <string.h>
#include <stdlib.h>

/* #define DEBUG_CPR_CHECKS */

uint32_t modeAC_count[4096];
uint32_t modeAC_lastcount[4096];
uint32_t modeAC_match[4096];
uint32_t modeAC_age[4096];

//
// Return a new aircraft structure for the linked list of tracked
// aircraft
//

static struct aircraft *trackCreateAircraft(struct _Modes *Modes, struct modesMessage *mm) {
    static struct aircraft zeroAircraft;
    struct aircraft *a = (struct aircraft *) malloc(sizeof (*a));
    int i;

    // Default everything to zero/NULL
    *a = zeroAircraft;
    aircraft_meta__init(&a->meta);
    aircraft_meta__nav_modes__init(&a->nav_modes);
    aircraft_meta__valid_source__init(&a->valid_source);

    // Now initialise things that should not be 0/NULL to their defaults
    a->meta.addr = mm->addr;
    a->meta.addr_type = mm->addrtype;
    for (i = 0; i < 8; ++i)
        a->signalLevel[i] = 1e-5;
    a->signalNext = 0;

    // defaults until we see a message otherwise
    a->adsb_version = -1;
    a->adsb_hrd = HEADING_MAGNETIC;
    a->adsb_tah = HEADING_GROUND_TRACK;

    // prime FATSV defaults we only emit on change

    // start off with the "last emitted" ACAS RA being blank (just the BDS 3,0
    // or ES type code)
    a->fatsv_emitted_bds_30[0] = 0x30;
    a->fatsv_emitted_es_acas_ra[0] = 0xE2;
    a->fatsv_emitted_adsb_version = -1;
    a->fatsv_emitted_addrtype = AIRCRAFT_META__ADDR_TYPE__ADDR_UNKNOWN;

    // don't immediately emit, let some data build up
    a->fatsv_last_emitted = a->fatsv_last_force_emit = messageNow();

    // Copy the first message so we can emit it later when a second message arrives.
    a->first_message = *mm;

    // initialize data validity ages
#define F(f,s,e) do { a->f##_valid.stale_interval = (s) * 1000; a->f##_valid.expire_interval = (e) * 1000; } while (0)
    F(callsign, 60, 70); // ADS-B or Comm-B
    F(altitude_baro, 15, 70); // ADS-B or Mode S
    F(altitude_geom, 60, 70); // ADS-B only
    F(geom_delta, 60, 70); // ADS-B only
    F(gs, 60, 70); // ADS-B or Comm-B
    F(ias, 60, 70); // ADS-B (rare) or Comm-B
    F(tas, 60, 70); // ADS-B (rare) or Comm-B
    F(mach, 60, 70); // Comm-B only
    F(track, 60, 70); // ADS-B or Comm-B
    F(track_rate, 60, 70); // Comm-B only
    F(roll, 60, 70); // Comm-B only
    F(mag_heading, 60, 70); // ADS-B (rare) or Comm-B
    F(true_heading, 60, 70); // ADS-B only (rare)
    F(baro_rate, 60, 70); // ADS-B or Comm-B
    F(geom_rate, 60, 70); // ADS-B or Comm-B
    F(squawk, 15, 70); // ADS-B or Mode S
    F(airground, 15, 70); // ADS-B or Mode S
    F(nav_qnh, 60, 70); // Comm-B only
    F(nav_altitude_mcp, 60, 70); // ADS-B or Comm-B
    F(nav_altitude_fms, 60, 70); // ADS-B or Comm-B
    F(nav_altitude_src, 60, 70); // ADS-B or Comm-B
    F(nav_heading, 60, 70); // ADS-B or Comm-B
    F(nav_modes, 60, 70); // ADS-B or Comm-B
    F(cpr_odd, 60, 70); // ADS-B only
    F(cpr_even, 60, 70); // ADS-B only
    F(position, 60, 70); // ADS-B only
    F(nic_a, 60, 70); // ADS-B only
    F(nic_c, 60, 70); // ADS-B only
    F(nic_baro, 60, 70); // ADS-B only
    F(nac_p, 60, 70); // ADS-B only
    F(nac_v, 60, 70); // ADS-B only
    F(sil, 60, 70); // ADS-B only
    F(gva, 60, 70); // ADS-B only
    F(sda, 60, 70); // ADS-B only
#undef F

    Modes->stats_current.unique_aircraft++;

    return (a);
}

//
//=========================================================================
//
// Return the aircraft with the specified address, or NULL if no aircraft
// exists with this address.
//

static struct aircraft *trackFindAircraft(struct _Modes *Modes, uint32_t addr) {
    struct aircraft *a = Modes->aircrafts[addr % AIRCRAFTS_BUCKETS];

    while (a) {
        if (a->meta.addr == addr) return (a);
        a = a->next;
    }
    return (NULL);
}

// Should we accept some new data from the given source?
// If so, update the validity and return 1

static int accept_data(struct _Modes *Modes, data_validity *d, datasource_t source, struct modesMessage *mm, int reduce_often) {
    if (messageNow() < d->updated)
        return 0;

    if (source < d->source && messageNow() < d->stale)
        return 0;

    d->source = source;
    d->updated = messageNow();
    d->stale = messageNow() + (d->stale_interval ? d->stale_interval : 60000);
    d->expires = messageNow() + (d->expire_interval ? d->expire_interval : 70000);

    if (messageNow() > d->next_reduce_forward && !mm->sbs_in) {
        if (mm->msgtype == 17 || reduce_often) {
            d->next_reduce_forward = messageNow() + Modes->net_output_beast_reduce_interval;
        } else {
            d->next_reduce_forward = messageNow() + Modes->net_output_beast_reduce_interval * 4;
        }
        // make sure global CPR stays possible even at high interval:
        if (Modes->net_output_beast_reduce_interval > 7000 && mm->cpr_valid) {
            d->next_reduce_forward = messageNow() + 7000;
        }
        mm->reduce_forward = 1;
    }

    return 1;
}

// Given two datasources, produce a third datasource for data combined from them.

static void combine_validity(data_validity *to, const data_validity *from1, const data_validity *from2) {
    if (from1->source == SOURCE_INVALID) {
        *to = *from2;
        return;
    }

    if (from2->source == SOURCE_INVALID) {
        *to = *from1;
        return;
    }

    to->source = (from1->source < from2->source) ? from1->source : from2->source; // the worse of the two input sources
    to->updated = (from1->updated > from2->updated) ? from1->updated : from2->updated; // the *later* of the two update times
    to->stale = (from1->stale < from2->stale) ? from1->stale : from2->stale; // the earlier of the two stale times
    to->expires = (from1->expires < from2->expires) ? from1->expires : from2->expires; // the earlier of the two expiry times
}

static int compare_validity(const data_validity *lhs, const data_validity *rhs) {
    if (messageNow() < lhs->stale && lhs->source > rhs->source)
        return 1;
    else if (messageNow() < rhs->stale && lhs->source < rhs->source)
        return -1;
    else if (lhs->updated > rhs->updated)
        return 1;
    else if (lhs->updated < rhs->updated)
        return -1;
    else
        return 0;
}

/**
 * Calculate bearing of two coordinates
 * @param lat0 Latitude start
 * @param lon0 Longitude start
 * @param lat1 Latitude end
 * @param lon1 Longitude end
 * @return Bearing in 0-360 degree.
 */
static double getBearing(double lat0, double lon0, double lat1, double lon1) {
    lat0 = lat0 * M_PI / 180.0;
    lon0 = lon0 * M_PI / 180.0;
    lat1 = lat1 * M_PI / 180.0;
    lon1 = lon1 * M_PI / 180.0;

    double dlon = lon1 - lon0;
    double x = cos(lat0) * sin(dlon);
    double y = cos(lat1) * sin(lat0) - sin(lat1) * cos(lat0) * cos(dlon);
    double b = atan2(x, y);
    double bearing = 180 / M_PI * b;
    return bearing + 180;
}

//
// CPR position updating
//

// Distance between points on a spherical earth.
// This has up to 0.5% error because the earth isn't actually spherical
// (but we don't use it in situations where that matters)

static double greatcircle(double lat0, double lon0, double lat1, double lon1) {
    double dlat, dlon;

    lat0 = lat0 * M_PI / 180.0;
    lon0 = lon0 * M_PI / 180.0;
    lat1 = lat1 * M_PI / 180.0;
    lon1 = lon1 * M_PI / 180.0;

    dlat = fabs(lat1 - lat0);
    dlon = fabs(lon1 - lon0);

    // use haversine for small distances for better numerical stability
    if (dlat < 0.001 && dlon < 0.001) {
        double a = sin(dlat / 2) * sin(dlat / 2) + cos(lat0) * cos(lat1) * sin(dlon / 2) * sin(dlon / 2);
        return 6371e3 * 2 * atan2(sqrt(a), sqrt(1.0 - a));
    }

    // spherical law of cosines
    return 6371e3 * acos(sin(lat0) * sin(lat1) + cos(lat0) * cos(lat1) * cos(dlon));
}

static uint32_t update_polar_range(struct _Modes *Modes, double lat, double lon) {
    double range = 0;
    int valid_latlon = Modes->bUserFlags & MODES_USER_LATLON_VALID;

    if (!valid_latlon)
        return 0;

    range = greatcircle(Modes->receiver.latitude, Modes->receiver.longitude, lat, lon);

    if ((range <= Modes->maxRange || Modes->maxRange == 0) && range > Modes->stats_current.longest_distance) {
        Modes->stats_current.longest_distance = range;
    }

    if (Modes->stats_polar_range) {
        // Round bearing to polarplot resolution.
        int bucket = round(getBearing(Modes->receiver.latitude, Modes->receiver.longitude, lat, lon) / POLAR_RANGE_RESOLUTION);
        // Catch and avoid out of bounds writes
        if (bucket >= POLAR_RANGE_BUCKETS) {
            bucket = 0;
        }
        
        if (bucket < POLAR_RANGE_BUCKETS && Modes->stats_range.polar_range[bucket] < range) {
            Modes->stats_range.polar_range[bucket] = (uint32_t) range;
        }
    }

    return (uint32_t) range;
}

// return true if it's OK for the aircraft to have travelled from its last known position
// to a new position at (lat,lon,surface) at a time of now.

static int speed_check(struct aircraft *a, double lat, double lon, int surface) {
    uint64_t elapsed;
    double distance;
    double range;
    int speed;
    int inrange;

    if (!trackDataValid(&a->position_valid))
        return 1; // no reference, assume OK

    elapsed = trackDataAge(&a->position_valid);

    if (trackDataValid(&a->gs_valid)) {
        // use the larger of the current and earlier speed
        speed = (a->gs_last_pos > a->meta.gs) ? a->gs_last_pos : a->meta.gs;
        // add 2 knots for every second we haven't known the speed
        speed = speed + (2 * trackDataAge(&a->gs_valid) / 1000.0);
    } else if (trackDataValid(&a->tas_valid)) {
        speed = a->meta.tas * 4 / 3;
    } else if (trackDataValid(&a->ias_valid)) {
        speed = a->meta.ias * 2;
    } else {
        speed = surface ? 100 : 700; // guess
    }

    // Work out a reasonable speed to use:
    //  current speed + 1/3
    //  surface speed min 20kt, max 150kt
    //  airborne speed min 200kt, no max
    speed = speed * 4 / 3;
    if (surface) {
        if (speed < 20)
            speed = 20;
        if (speed > 150)
            speed = 150;
    } else {
        if (speed < 200)
            speed = 200;
    }

    // 100m (surface) or 500m (airborne) base distance to allow for minor errors,
    // plus distance covered at the given speed for the elapsed time + 1 second.
    range = (surface ? 0.1e3 : 0.5e3) + ((elapsed + 1000.0) / 1000.0) * (speed * 1852.0 / 3600.0);

    // find actual distance
    distance = greatcircle(a->meta.lat, a->meta.lon, lat, lon);

    inrange = (distance <= range);
#ifdef DEBUG_CPR_CHECKS
    if (!inrange) {
        fprintf(stderr, "Speed check failed: %06x: %.3f,%.3f -> %.3f,%.3f in %.1f seconds, max speed %d kt, range %.1fkm, actual %.1fkm\n",
                a->addr, a->lat, a->lon, lat, lon, elapsed / 1000.0, speed, range / 1000.0, distance / 1000.0);
    }
#endif

    return inrange;
}

static int doGlobalCPR(struct _Modes *Modes, struct aircraft *a, struct modesMessage *mm, double *lat, double *lon, unsigned *nic, unsigned *rc) {
    int result;
    int fflag = mm->cpr_odd;
    int surface = (mm->cpr_type == CPR_SURFACE);

    // derive NIC, Rc from the worse of the two position
    // smaller NIC is worse; larger Rc is worse
    *nic = (a->cpr_even_nic < a->cpr_odd_nic ? a->cpr_even_nic : a->cpr_odd_nic);
    *rc = (a->cpr_even_rc > a->cpr_odd_rc ? a->cpr_even_rc : a->cpr_odd_rc);

    if (surface) {
        // surface global CPR
        // find reference location
        double reflat, reflon;

        if (trackDataValid(&a->position_valid)) { // Ok to try aircraft relative first
            reflat = a->meta.lat;
            reflon = a->meta.lon;
        } else if (Modes->bUserFlags & MODES_USER_LATLON_VALID) {
            reflat = Modes->receiver.latitude;
            reflon = Modes->receiver.longitude;
        } else {
            // No local reference, give up
            return (-1);
        }

        result = decodeCPRsurface(reflat, reflon,
                a->cpr_even_lat, a->cpr_even_lon,
                a->cpr_odd_lat, a->cpr_odd_lon,
                fflag,
                lat, lon);
    } else {
        // airborne global CPR
        result = decodeCPRairborne(a->cpr_even_lat, a->cpr_even_lon,
                a->cpr_odd_lat, a->cpr_odd_lon,
                fflag,
                lat, lon);
    }

    if (result < 0) {
#ifdef DEBUG_CPR_CHECKS
        fprintf(stderr, "CPR: decode failure for %06X (%d).\n", a->addr, result);
        fprintf(stderr, "  even: %d %d   odd: %d %d  fflag: %s\n",
                a->cpr_even_lat, a->cpr_even_lon,
                a->cpr_odd_lat, a->cpr_odd_lon,
                fflag ? "odd" : "even");
#endif
        return result;
    }

    // check max range
    if (Modes->maxRange > 0 && (Modes->bUserFlags & MODES_USER_LATLON_VALID)) {
        double range = greatcircle(Modes->receiver.latitude, Modes->receiver.longitude, *lat, *lon);
        if (range > Modes->maxRange) {
#ifdef DEBUG_CPR_CHECKS
            fprintf(stderr, "Global range check failed: %06x: %.3f,%.3f, max range %.1fkm, actual %.1fkm\n",
                    a->addr, *lat, *lon, Modes->maxRange / 1000.0, range / 1000.0);
#endif

            Modes->stats_current.cpr_global_range_checks++;
            return (-2); // we consider an out-of-range value to be bad data
        }
    }

    // for mlat results, skip the speed check
    if (mm->source == SOURCE_MLAT)
        return result;

    // check speed limit
    if (trackDataValid(&a->position_valid) && mm->source <= a->position_valid.source && !speed_check(a, *lat, *lon, surface)) {
        Modes->stats_current.cpr_global_speed_checks++;
        return -2;
    }

    return result;
}

static int doLocalCPR(struct _Modes *Modes, struct aircraft *a, struct modesMessage *mm, double *lat, double *lon, unsigned *nic, unsigned *rc) {
    // relative CPR
    // find reference location
    double reflat, reflon;
    double range_limit = 0;
    int result;
    int fflag = mm->cpr_odd;
    int surface = (mm->cpr_type == CPR_SURFACE);
    int relative_to = 0; // aircraft(1) or receiver(2) relative

    if (fflag) {
        *nic = a->cpr_odd_nic;
        *rc = a->cpr_odd_rc;
    } else {
        *nic = a->cpr_even_nic;
        *rc = a->cpr_even_rc;
    }

    if (messageNow() - a->position_valid.updated < (10 * 60 * 1000)) {
        reflat = a->meta.lat;
        reflon = a->meta.lon;

        if (a->meta.nic < *nic)
            *nic = a->meta.nic;
        if (a->meta.rc < *rc)
            *rc = a->meta.rc;

        range_limit = 1852 * 100; // 100NM
        // 100 NM in the 10 minutes of position validity means 600 knots which
        // is fast but happens even for commercial airliners.
        // It's not a problem if this limitation fails every now and then.
        // A wrong relative position decode would require the aircraft to
        // travel 360-100=260 NM in the 10 minutes of position validity.
        // This is impossible for planes slower than 1560 knots/Mach 2.3 over the ground.
        // Thus this range limit combined with the 10 minutes of position
        // validity should not provide bad positions (1 cell away).

        relative_to = 1;
    } else if (!surface && (Modes->bUserFlags & MODES_USER_LATLON_VALID)) {
        reflat = Modes->receiver.latitude;
        reflon = Modes->receiver.longitude;

        // The cell size is at least 360NM, giving a nominal
        // max range of 180NM (half a cell).
        //
        // If the receiver range is more than half a cell
        // then we must limit this range further to avoid
        // ambiguity. (e.g. if we receive a position report
        // at 200NM distance, this may resolve to a position
        // at (200-360) = 160NM in the wrong direction)

        if (Modes->maxRange == 0) {
            return (-1); // Can't do receiver-centered checks at all
        } else if (Modes->maxRange <= 1852 * 180) {
            range_limit = Modes->maxRange;
        } else if (Modes->maxRange < 1852 * 360) {
            range_limit = (1852 * 360) - Modes->maxRange;
        } else {
            return (-1); // Can't do receiver-centered checks at all
        }
        relative_to = 2;
    } else {
        // No local reference, give up
        return (-1);
    }

    result = decodeCPRrelative(reflat, reflon,
            mm->cpr_lat,
            mm->cpr_lon,
            fflag, surface,
            lat, lon);
    if (result < 0) {
        return result;
    }

    // check range limit
    if (range_limit > 0) {
        double range = greatcircle(reflat, reflon, *lat, *lon);
        if (range > range_limit) {
            Modes->stats_current.cpr_local_range_checks++;
            return (-1);
        }
    }

    // check speed limit
    if (trackDataValid(&a->position_valid) && mm->source <= a->position_valid.source && !speed_check(a, *lat, *lon, surface)) {
#ifdef DEBUG_CPR_CHECKS
        fprintf(stderr, "Speed check for %06X with local decoding failed\n", a->addr);
#endif
        Modes->stats_current.cpr_local_speed_checks++;
        return -1;
    }

    return relative_to;
}

static uint64_t time_between(uint64_t t1, uint64_t t2) {
    if (t1 >= t2)
        return t1 - t2;
    else
        return t2 - t1;
}

static void updatePosition(struct _Modes *Modes, struct aircraft *a, struct modesMessage *mm) {
    int location_result = -1;
    uint64_t max_elapsed;
    double new_lat = 0, new_lon = 0;
    unsigned new_nic = 0;
    unsigned new_rc = 0;
    int surface;

    surface = (mm->cpr_type == CPR_SURFACE);

    if (surface) {
        ++Modes->stats_current.cpr_surface;

        // Surface: 25 seconds if >25kt or speed unknown, 50 seconds otherwise
        if (mm->gs_valid && mm->gs.selected <= 25)
            max_elapsed = 50000;
        else
            max_elapsed = 25000;
    } else {
        ++Modes->stats_current.cpr_airborne;

        // Airborne: 10 seconds
        max_elapsed = 10000;
    }

    // If we have enough recent data, try global CPR
    if (trackDataValid(&a->cpr_odd_valid) && trackDataValid(&a->cpr_even_valid) &&
            a->cpr_odd_valid.source == a->cpr_even_valid.source &&
            a->cpr_odd_type == a->cpr_even_type &&
            time_between(a->cpr_odd_valid.updated, a->cpr_even_valid.updated) <= max_elapsed) {

        location_result = doGlobalCPR(Modes, a, mm, &new_lat, &new_lon, &new_nic, &new_rc);

        if (location_result == -2) {
#ifdef DEBUG_CPR_CHECKS
            fprintf(stderr, "global CPR failure (invalid) for (%06X).\n", a->addr);
#endif
            // Global CPR failed because the position produced implausible results.
            // This is bad data.
            // At least one of the CPRs is bad, mark them both invalid.
            // If we are not confident in the position, invalidate it as well.

            Modes->stats_current.cpr_global_bad++;

            a->cpr_odd_valid.source = SOURCE_INVALID;
            a->cpr_even_valid.source = SOURCE_INVALID;
            a->pos_reliable_odd--;
            a->pos_reliable_even--;

            if (a->pos_reliable_odd <= 0 || a->pos_reliable_even <= 0) {
                a->position_valid.source = SOURCE_INVALID;
                a->pos_reliable_odd = 0;
                a->pos_reliable_even = 0;
            }

            return;
        } else if (location_result == -1) {
#ifdef DEBUG_CPR_CHECKS
            if (mm->source == SOURCE_MLAT) {
                fprintf(stderr, "CPR skipped from MLAT (%06X).\n", a->addr);
            }
#endif
            // No local reference for surface position available, or the two messages crossed a zone.
            // Nonfatal, try again later.
            Modes->stats_current.cpr_global_skipped++;
        } else {
            if (accept_data(Modes, &a->position_valid, mm->source, mm, 1)) {
                Modes->stats_current.cpr_global_ok++;

                if (a->pos_reliable_odd <= 0 || a->pos_reliable_even <= 0) {
                    a->pos_reliable_odd = 1;
                    a->pos_reliable_even = 1;
                } else if (mm->cpr_odd) {
                    a->pos_reliable_odd = min(a->pos_reliable_odd + 1, Modes->filter_persistence);
                } else {
                    a->pos_reliable_even = min(a->pos_reliable_even + 1, Modes->filter_persistence);
                }

                if (trackDataValid(&a->gs_valid))
                    a->gs_last_pos = a->meta.gs;

            } else {
                Modes->stats_current.cpr_global_skipped++;
                location_result = -2;
            }
        }
    }

    // Otherwise try relative CPR.
    if (location_result == -1) {
        location_result = doLocalCPR(Modes, a, mm, &new_lat, &new_lon, &new_nic, &new_rc);

        if (location_result >= 0 && accept_data(Modes, &a->position_valid, mm->source, mm, 1)) {
            Modes->stats_current.cpr_local_ok++;
            mm->cpr_relative = 1;

            if (trackDataValid(&a->gs_valid))
                a->gs_last_pos = a->meta.gs;

            if (location_result == 1) {
                Modes->stats_current.cpr_local_aircraft_relative++;
            }
            if (location_result == 2) {
                Modes->stats_current.cpr_local_receiver_relative++;
            }
        } else {
            Modes->stats_current.cpr_local_skipped++;
            location_result = -1;
        }
    }

    if (location_result >= 0) {
        // If we sucessfully decoded, back copy the results to mm so that we can print them in list output
        mm->cpr_decoded = 1;
        mm->decoded_lat = new_lat;
        mm->decoded_lon = new_lon;
        mm->decoded_nic = new_nic;
        mm->decoded_rc = new_rc;

        // Update aircraft state
        a->meta.lat = new_lat;
        a->meta.lon = new_lon;
        a->meta.nic = new_nic;
        a->meta.rc = new_rc;

        double dip, ti, gv;
        // Update magnetic declination whenever position changes
        if (trackDataValid(&a->altitude_geom_valid)) {
            // Altitude given in feet but required to be in kilometer above WGS84 ellipsoid.
            geomag_calc(a->meta.alt_geom * 0.0003048, a->meta.lat, a->meta.lon, -1.0, &a->meta.declination, &dip, &ti, &gv);
        }

        a->meta.distance = false;
        if (a->pos_reliable_odd >= 1 && a->pos_reliable_even >= 1 && mm->source == SOURCE_ADSB) {
            a->meta.distance = update_polar_range(Modes, new_lat, new_lon);
        }
    }
}

static unsigned compute_nic(unsigned metype, unsigned version, unsigned nic_a, unsigned nic_b, unsigned nic_c) {
    switch (metype) {
        case 5: // surface
        case 9: // airborne
        case 20: // airborne, GNSS altitude
            return 11;

        case 6: // surface
        case 10: // airborne
        case 21: // airborne, GNSS altitude
            return 10;

        case 7: // surface
            if (version == 2) {
                if (nic_a && !nic_c) {
                    return 9;
                } else {
                    return 8;
                }
            } else if (version == 1) {
                if (nic_a) {
                    return 9;
                } else {
                    return 8;
                }
            } else {
                return 8;
            }

        case 8: // surface
            if (version == 2) {
                if (nic_a && nic_c) {
                    return 7;
                } else if (nic_a && !nic_c) {
                    return 6;
                } else if (!nic_a && nic_c) {
                    return 6;
                } else {
                    return 0;
                }
            } else {
                return 0;
            }

        case 11: // airborne
            if (version == 2) {
                if (nic_a && nic_b) {
                    return 9;
                } else {
                    return 8;
                }
            } else if (version == 1) {
                if (nic_a) {
                    return 9;
                } else {
                    return 8;
                }
            } else {
                return 8;
            }

        case 12: // airborne
            return 7;

        case 13: // airborne
            return 6;

        case 14: // airborne
            return 5;

        case 15: // airborne
            return 4;

        case 16: // airborne
            if (nic_a && nic_b) {
                return 3;
            } else {
                return 2;
            }

        case 17: // airborne
            return 1;

        default:
            return 0;
    }
}

static unsigned compute_rc(unsigned metype, unsigned version, unsigned nic_a, unsigned nic_b, unsigned nic_c) {
    switch (metype) {
        case 5: // surface
        case 9: // airborne
        case 20: // airborne, GNSS altitude
            return 8; // 7.5m

        case 6: // surface
        case 10: // airborne
        case 21: // airborne, GNSS altitude
            return 25;

        case 7: // surface
            if (version == 2) {
                if (nic_a && !nic_c) {
                    return 75;
                } else {
                    return 186; // 185.2m, 0.1NM
                }
            } else if (version == 1) {
                if (nic_a) {
                    return 75;
                } else {
                    return 186; // 185.2m, 0.1NM
                }
            } else {
                return 186; // 185.2m, 0.1NM
            }

        case 8: // surface
            if (version == 2) {
                if (nic_a && nic_c) {
                    return 371; // 370.4m, 0.2NM
                } else if (nic_a && !nic_c) {
                    return 556; // 555.6m, 0.3NM
                } else if (!nic_a && nic_c) {
                    return 926; // 926m, 0.5NM
                } else {
                    return RC_UNKNOWN;
                }
            } else {
                return RC_UNKNOWN;
            }

        case 11: // airborne
            if (version == 2) {
                if (nic_a && nic_b) {
                    return 75;
                } else {
                    return 186; // 370.4m, 0.2NM
                }
            } else if (version == 1) {
                if (nic_a) {
                    return 75;
                } else {
                    return 186; // 370.4m, 0.2NM
                }
            } else {
                return 186; // 370.4m, 0.2NM
            }

        case 12: // airborne
            return 371; // 370.4m, 0.2NM

        case 13: // airborne
            if (version == 2) {
                if (!nic_a && nic_b) {
                    return 556; // 555.6m, 0.3NM
                } else if (!nic_a && !nic_b) {
                    return 926; // 926m, 0.5NM
                } else if (nic_a && nic_b) {
                    return 1112; // 1111.2m, 0.6NM
                } else {
                    return RC_UNKNOWN; // bad combination, assume worst Rc
                }
            } else if (version == 1) {
                if (nic_a) {
                    return 1112; // 1111.2m, 0.6NM
                } else {
                    return 926; // 926m, 0.5NM
                }
            } else {
                return 926; // 926m, 0.5NM
            }

        case 14: // airborne
            return 1852; // 1.0NM

        case 15: // airborne
            return 3704; // 2NM

        case 16: // airborne
            if (version == 2) {
                if (nic_a && nic_b) {
                    return 7408; // 4NM
                } else {
                    return 14816; // 8NM
                }
            } else if (version == 1) {
                if (nic_a) {
                    return 7408; // 4NM
                } else {
                    return 14816; // 8NM
                }
            } else {
                return 18520; // 10NM
            }

        case 17: // airborne
            return 37040; // 20NM

        default:
            return RC_UNKNOWN;
    }
}

// Map ADS-B v0 position message type to NACp value
// returned computed NACp, or -1 if not a suitable message type

static int compute_v0_nacp(struct modesMessage *mm) {
    if (mm->msgtype != 17 && mm->msgtype != 18) {
        return -1;
    }

    // ED-102A Table N-7
    switch (mm->metype) {
        case 0: return 0;
        case 5: return 11;
        case 6: return 10;
        case 7: return 8;
        case 8: return 0;
        case 9: return 11;
        case 10: return 10;
        case 11: return 8;
        case 12: return 7;
        case 13: return 6;
        case 14: return 5;
        case 15: return 4;
        case 16: return 1;
        case 17: return 1;
        case 18: return 0;
        case 20: return 11;
        case 21: return 10;
        case 22: return 0;
        default: return -1;
    }
}

// Map ADS-B v0 position message type to SIL value
// returned computed SIL, or -1 if not a suitable message type

static int compute_v0_sil(struct modesMessage *mm) {
    if (mm->msgtype != 17 && mm->msgtype != 18) {
        return -1;
    }

    // ED-102A Table N-8
    switch (mm->metype) {
        case 0:
            return 0;

        case 5:
        case 6:
        case 7:
        case 8:
        case 9:
        case 10:
        case 11:
        case 12:
        case 13:
        case 14:
        case 15:
        case 16:
        case 17:
            return 2;

        case 18:
            return 0;

        case 20:
        case 21:
            return 2;

        case 22:
            return 0;

        default:
            return -1;
    }
}

static void compute_nic_rc_from_message(struct modesMessage *mm, struct aircraft *a, unsigned *nic, unsigned *rc) {
    int nic_a = (trackDataValid(&a->nic_a_valid) && a->nic_a);
    int nic_b = (mm->accuracy.nic_b_valid && mm->accuracy.nic_b);
    int nic_c = (trackDataValid(&a->nic_c_valid) && a->nic_c);

    *nic = compute_nic(mm->metype, a->adsb_version, nic_a, nic_b, nic_c);
    *rc = compute_rc(mm->metype, a->adsb_version, nic_a, nic_b, nic_c);
}

static int altitude_to_feet(int raw, altitude_unit_t unit) {
    switch (unit) {
        case UNIT_METERS:
            return raw / 0.3048;
        case UNIT_FEET:
            return raw;
        default:
            return 0;
    }
}

//
//=========================================================================
//
// Receive new messages and update tracked aircraft state
//

struct aircraft *trackUpdateFromMessage(struct _Modes *Modes, struct modesMessage *mm) {
    struct aircraft *a;
    unsigned int cpr_new = 0;

    if (mm->msgtype == 32) {
        // Mode A/C, just count it (we ignore SPI)
        modeAC_count[modeAToIndex(mm->squawk)]++;
        return NULL;
    }

    if (mm->addr == 0) {
        // junk address, don't track it
        return NULL;
    }

    _messageNow = mm->sysTimestampMsg;

    // Lookup our aircraft or create a new one
    a = trackFindAircraft(Modes, mm->addr);
    if (!a) { // If it's a currently unknown aircraft....
        a = trackCreateAircraft(Modes, mm); // ., create a new record for it,
        a->next = Modes->aircrafts[mm->addr % AIRCRAFTS_BUCKETS]; // .. and put it at the head of the list
        Modes->aircrafts[mm->addr % AIRCRAFTS_BUCKETS] = a;
    }

    if (mm->signalLevel > 0) {
        a->signalLevel[a->signalNext] = mm->signalLevel;
        a->signalNext = (a->signalNext + 1) & 7;
    }
    a->meta.seen = mm->sysTimestampMsg;
    a->meta.messages++;

    // update addrtype, we only ever go towards "more direct" types
    if (mm->addrtype < a->meta.addr_type) {
        a->meta.addr_type = mm->addrtype;
    }

    // decide on where to stash the version
    int dummy_version = -1; // used for non-adsb/adsr/tisb messages
    int *message_version;

    switch (mm->source) {
        case SOURCE_ADSB:
            message_version = &a->adsb_version;
            break;
        case SOURCE_TISB:
            message_version = &a->tisb_version;
            break;
        case SOURCE_ADSR:
            message_version = &a->adsr_version;
            break;
        default:
            message_version = &dummy_version;
            break;
    }

    // assume version 0 until we see something else
    if (*message_version < 0) {
        *message_version = 0;
    }

    // category shouldn't change over time, don't bother with metadata
    if (mm->category_valid) {
        a->meta.category = mm->category;
    }

    // operational status message
    // done early to update version / HRD / TAH
    if (mm->opstatus.valid) {
        *message_version = mm->opstatus.version;

        if (mm->opstatus.hrd != HEADING_INVALID) {
            a->adsb_hrd = mm->opstatus.hrd;
        }
        if (mm->opstatus.tah != HEADING_INVALID) {
            a->adsb_tah = mm->opstatus.tah;
        }
    }

    // fill in ADS-B v0 NACp, SIL from position message type
    if (*message_version == 0 && !mm->accuracy.nac_p_valid) {
        int computed_nacp = compute_v0_nacp(mm);
        if (computed_nacp != -1) {
            mm->accuracy.nac_p_valid = 1;
            mm->accuracy.nac_p = computed_nacp;
        }
    }

    if (*message_version == 0 && mm->accuracy.sil_type == AIRCRAFT_META__SIL_TYPE__SIL_INVALID) {
        int computed_sil = compute_v0_sil(mm);
        if (computed_sil != -1) {
            mm->accuracy.sil_type = AIRCRAFT_META__SIL_TYPE__SIL_UNKNOWN;
            mm->accuracy.sil = computed_sil;
        }
    }

    if (mm->altitude_baro_valid &&
            (mm->source >= a->altitude_baro_valid.source ||
            trackDataAge(&a->altitude_baro_valid) > 15 * 1000)
            ) {
        int alt = altitude_to_feet(mm->altitude_baro, mm->altitude_baro_unit);
        if (a->modeC_hit) {
            int new_modeC = (a->meta.alt_baro + 49) / 100;
            int old_modeC = (alt + 49) / 100;
            if (new_modeC != old_modeC) {
                a->modeC_hit = 0;
            }
        }

        int delta = alt - a->meta.alt_baro;
        int fpm = 0;

        int max_fpm = 12500;
        int min_fpm = -12500;

        if (abs(delta) >= 300) {
            fpm = delta * 60 * 10 / (abs((int) trackDataAge(&a->altitude_baro_valid) / 100) + 10);
            if (trackDataValid(&a->geom_rate_valid) && trackDataAge(&a->geom_rate_valid) < trackDataAge(&a->baro_rate_valid)) {
                min_fpm = a->meta.geom_rate - 1500 - min(11000, ((int) trackDataAge(&a->geom_rate_valid) / 2));
                max_fpm = a->meta.geom_rate + 1500 + min(11000, ((int) trackDataAge(&a->geom_rate_valid) / 2));
            } else if (trackDataValid(&a->baro_rate_valid)) {
                min_fpm = a->meta.baro_rate - 1500 - min(11000, ((int) trackDataAge(&a->baro_rate_valid) / 2));
                max_fpm = a->meta.baro_rate + 1500 + min(11000, ((int) trackDataAge(&a->baro_rate_valid) / 2));
            }
            if (trackDataValid(&a->altitude_baro_valid) && trackDataAge(&a->altitude_baro_valid) < 30000) {
                a->altitude_baro_reliable = min(
                        ALTITUDE_BARO_RELIABLE_MAX - (ALTITUDE_BARO_RELIABLE_MAX * trackDataAge(&a->altitude_baro_valid) / 30000),
                        a->altitude_baro_reliable);
            } else {
                a->altitude_baro_reliable = 0;
            }
        }
        int good_crc = (mm->crc == 0 && mm->source != SOURCE_MLAT) ? (ALTITUDE_BARO_RELIABLE_MAX / 2 - 1) : 0;

        if (a->altitude_baro_reliable <= 0 || abs(delta) < 300
                || (fpm < max_fpm && fpm > min_fpm)
                || (good_crc && a->altitude_baro_reliable <= (ALTITUDE_BARO_RELIABLE_MAX / 2 + 2))
                ) {
            if (accept_data(Modes, &a->altitude_baro_valid, mm->source, mm, 1)) {
                a->altitude_baro_reliable = min(ALTITUDE_BARO_RELIABLE_MAX, a->altitude_baro_reliable + (good_crc + 1));
                /*if (abs(delta) > 2000 && delta != alt) {
                    fprintf(stderr, "Alt change B: %06x: %d   %d -> %d, min %.1f kfpm, max %.1f kfpm, actual %.1f kfpm\n",
                        a->addr, a->altitude_baro_reliable, a->altitude_baro, alt, min_fpm/1000.0, max_fpm/1000.0, fpm/1000.0);
                }*/
                a->meta.alt_baro = alt;
            }
        } else {
            a->altitude_baro_reliable = a->altitude_baro_reliable - (good_crc + 1);
            //fprintf(stderr, "Alt check F: %06x: %d   %d -> %d, min %.1f kfpm, max %.1f kfpm, actual %.1f kfpm\n",
            //        a->addr, a->altitude_baro_reliable, a->altitude_baro, alt, min_fpm/1000.0, max_fpm/1000.0, fpm/1000.0);
            if (a->altitude_baro_reliable <= 0) {
                //fprintf(stderr, "Altitude INVALIDATED: %06x\n", a->addr);
                a->altitude_baro_reliable = 0;
                a->altitude_baro_valid.source = SOURCE_INVALID;
            }
        }
    }

    if (mm->squawk_valid && accept_data(Modes, &a->squawk_valid, mm->source, mm, 0)) {
        if (mm->squawk != a->meta.squawk) {
            a->modeA_hit = 0;
        }
        a->meta.squawk = mm->squawk;

#if 0   // Disabled for now as it obscures the origin of the data
        // Handle 7x00 without a corresponding emergency status
        if (!mm->emergency_valid) {
            emergency_t squawk_emergency;
            switch (mm->squawk) {
                case 0x7500:
                    squawk_emergency = EMERGENCY_UNLAWFUL;
                    break;
                case 0x7600:
                    squawk_emergency = EMERGENCY_NORDO;
                    break;
                case 0x7700:
                    squawk_emergency = EMERGENCY_GENERAL;
                    break;
                default:
                    squawk_emergency = EMERGENCY_NONE;
                    break;
            }

            if (squawk_emergency != EMERGENCY_NONE && accept_data(Modes, &a->emergency_valid, mm->source, mm, 0)) {
                a->emergency = squawk_emergency;
            }
        }
#endif
    }

    if (mm->emergency_valid && accept_data(Modes, &a->emergency_valid, mm->source, mm, 0)) {
        a->meta.emergency = mm->emergency;
    }

    if (mm->altitude_geom_valid && accept_data(Modes, &a->altitude_geom_valid, mm->source, mm, 1)) {
        a->meta.alt_geom = altitude_to_feet(mm->altitude_geom, mm->altitude_geom_unit);
    }

    if (mm->geom_delta_valid && accept_data(Modes, &a->geom_delta_valid, mm->source, mm, 1)) {
        a->geom_delta = mm->geom_delta;
    }

    if (mm->heading_valid) {
        a->heading_type = mm->heading_type;
        if (a->heading_type == HEADING_MAGNETIC_OR_TRUE) {
            a->heading_type = a->adsb_hrd;
        } else if (a->heading_type == HEADING_TRACK_OR_HEADING) {
            a->heading_type = a->adsb_tah;
        }

        if (a->heading_type == HEADING_GROUND_TRACK && accept_data(Modes, &a->track_valid, mm->source, mm, 1)) {
            a->meta.track = mm->heading;
        } else if (a->heading_type == HEADING_MAGNETIC && accept_data(Modes, &a->mag_heading_valid, mm->source, mm, 1)) {
            a->meta.mag_heading = mm->heading;
        } else if (a->heading_type == HEADING_TRUE && accept_data(Modes, &a->true_heading_valid, mm->source, mm, 1)) {
            a->meta.true_heading = mm->heading;
        }
    }

    if (mm->track_rate_valid && accept_data(Modes, &a->track_rate_valid, mm->source, mm, 1)) {
        a->meta.track_rate = mm->track_rate;
    }

    if (mm->roll_valid && accept_data(Modes, &a->roll_valid, mm->source, mm, 1)) {
        a->meta.roll = mm->roll;
    }

    if (mm->gs_valid) {
        mm->gs.selected = (*message_version == 2 ? mm->gs.v2 : mm->gs.v0);
        if (accept_data(Modes, &a->gs_valid, mm->source, mm, 1)) {
            a->meta.gs = mm->gs.selected;
        }
    }

    if (mm->ias_valid && accept_data(Modes, &a->ias_valid, mm->source, mm, 0)) {
        a->meta.ias = mm->ias;
    }

    if (mm->tas_valid && accept_data(Modes, &a->tas_valid, mm->source, mm, 0)) {
        a->meta.tas = mm->tas;
    }

    if (mm->mach_valid && accept_data(Modes, &a->mach_valid, mm->source, mm, 0)) {
        a->meta.mach = mm->mach;
    }

    if (mm->baro_rate_valid && accept_data(Modes, &a->baro_rate_valid, mm->source, mm, 1)) {
        a->meta.baro_rate = mm->baro_rate;
    }

    if (mm->geom_rate_valid && accept_data(Modes, &a->geom_rate_valid, mm->source, mm, 1)) {
        a->meta.geom_rate = mm->geom_rate;
    }

    if (mm->airground != AIRCRAFT_META__AIR_GROUND__AG_INVALID) {
        // If our current state is UNCERTAIN, accept new data as normal
        // If our current state is certain but new data is not, only accept the uncertain state if the certain data has gone stale
        if (mm->airground != AIRCRAFT_META__AIR_GROUND__AG_UNCERTAIN ||
                (mm->airground == AIRCRAFT_META__AIR_GROUND__AG_UNCERTAIN && !trackDataFresh(&a->airground_valid))) {
            if (accept_data(Modes, &a->airground_valid, mm->source, mm, 0)) {
                a->meta.air_ground = mm->airground;
            }
        }
    }

    if (mm->callsign_valid && accept_data(Modes, &a->callsign_valid, mm->source, mm, 0)) {
        memcpy(a->callsign, mm->callsign, sizeof (a->callsign));
    }

    if (mm->nav.mcp_altitude_valid && accept_data(Modes, &a->nav_altitude_mcp_valid, mm->source, mm, 0)) {
        a->meta.nav_altitude_mcp = mm->nav.mcp_altitude;
    }

    if (mm->nav.fms_altitude_valid && accept_data(Modes, &a->nav_altitude_fms_valid, mm->source, mm, 0)) {
        a->meta.nav_altitude_fms = mm->nav.fms_altitude;
    }

    if (mm->nav.altitude_source != NAV_ALT_INVALID && accept_data(Modes, &a->nav_altitude_src_valid, mm->source, mm, 0)) {
        a->nav_altitude_src = mm->nav.altitude_source;
    }

    if (mm->nav.heading_valid && accept_data(Modes, &a->nav_heading_valid, mm->source, mm, 0)) {
        a->meta.nav_heading = mm->nav.heading;
    }

    if (mm->nav.modes_valid && accept_data(Modes, &a->nav_modes_valid, mm->source, mm, 0)) {
        if (mm->nav.modes & NAV_MODE_AUTOPILOT) {
            a->nav_modes.autopilot = true;
        }
        if (mm->nav.modes & NAV_MODE_VNAV) {
            a->nav_modes.vnav = true;
        }
        if (mm->nav.modes & NAV_MODE_ALT_HOLD) {
            a->nav_modes.althold = true;
        }
        if (mm->nav.modes & NAV_MODE_APPROACH) {
            a->nav_modes.approach = true;
        }
        if (mm->nav.modes & NAV_MODE_LNAV) {
            a->nav_modes.lnav = true;
        }
        if (mm->nav.modes & NAV_MODE_TCAS) {
            a->nav_modes.tcas = true;
        }
    }

    if (mm->nav.qnh_valid && accept_data(Modes, &a->nav_qnh_valid, mm->source, mm, 0)) {
        a->meta.nav_qnh = mm->nav.qnh;
    }

    if (mm->alert_valid && accept_data(Modes, &a->alert_valid, mm->source, mm, 0)) {
        a->meta.alert = mm->alert;
    }

    if (mm->spi_valid && accept_data(Modes, &a->spi_valid, mm->source, mm, 0)) {
        a->meta.spi = mm->spi;
    }

    // CPR, even
    if (mm->cpr_valid && !mm->cpr_odd && accept_data(Modes, &a->cpr_even_valid, mm->source, mm, 1)) {
        a->cpr_even_type = mm->cpr_type;
        a->cpr_even_lat = mm->cpr_lat;
        a->cpr_even_lon = mm->cpr_lon;
        compute_nic_rc_from_message(mm, a, &a->cpr_even_nic, &a->cpr_even_rc);
        cpr_new = 1;
    }

    // CPR, odd
    if (mm->cpr_valid && mm->cpr_odd && accept_data(Modes, &a->cpr_odd_valid, mm->source, mm, 1)) {
        a->cpr_odd_type = mm->cpr_type;
        a->cpr_odd_lat = mm->cpr_lat;
        a->cpr_odd_lon = mm->cpr_lon;
        compute_nic_rc_from_message(mm, a, &a->cpr_odd_nic, &a->cpr_odd_rc);
        cpr_new = 1;
    }

    if (mm->accuracy.sda_valid && accept_data(Modes, &a->sda_valid, mm->source, mm, 0)) {
        a->meta.sda = mm->accuracy.sda;
    }

    if (mm->accuracy.nic_a_valid && accept_data(Modes, &a->nic_a_valid, mm->source, mm, 0)) {
        a->nic_a = mm->accuracy.nic_a;
    }

    if (mm->accuracy.nic_c_valid && accept_data(Modes, &a->nic_c_valid, mm->source, mm, 0)) {
        a->nic_c = mm->accuracy.nic_c;
    }

    if (mm->accuracy.nic_baro_valid && accept_data(Modes, &a->nic_baro_valid, mm->source, mm, 0)) {
        a->meta.nic_baro = mm->accuracy.nic_baro;
    }

    if (mm->accuracy.nac_p_valid && accept_data(Modes, &a->nac_p_valid, mm->source, mm, 0)) {
        a->meta.nac_p = mm->accuracy.nac_p;
    }

    if (mm->accuracy.nac_v_valid && accept_data(Modes, &a->nac_v_valid, mm->source, mm, 0)) {
        a->meta.nac_v = mm->accuracy.nac_v;
    }

    if (mm->accuracy.sil_type != AIRCRAFT_META__SIL_TYPE__SIL_INVALID && accept_data(Modes, &a->sil_valid, mm->source, mm, 0)) {
        a->meta.sil = mm->accuracy.sil;
        if (a->meta.sil_type == AIRCRAFT_META__SIL_TYPE__SIL_INVALID || mm->accuracy.sil_type != AIRCRAFT_META__SIL_TYPE__SIL_UNKNOWN) {
            a->meta.sil_type = mm->accuracy.sil_type;
        }
    }

    if (mm->accuracy.gva_valid && accept_data(Modes, &a->gva_valid, mm->source, mm, 0)) {
        a->meta.gva = mm->accuracy.gva;
    }

    if (mm->accuracy.sda_valid && accept_data(Modes, &a->sda_valid, mm->source, mm, 0)) {
        a->meta.sda = mm->accuracy.sda;
    }

    // Now handle derived data

    // derive geometric altitude if we have baro + delta
    if (a->altitude_baro_reliable >= 3 && compare_validity(&a->altitude_baro_valid, &a->altitude_geom_valid) > 0 &&
            compare_validity(&a->geom_delta_valid, &a->altitude_geom_valid) > 0) {
        // Baro and delta are both more recent than geometric, derive geometric from baro + delta
        a->meta.alt_geom = a->meta.alt_baro + a->geom_delta;
        combine_validity(&a->altitude_geom_valid, &a->altitude_baro_valid, &a->geom_delta_valid);
    }

    // If we've got a new cpr_odd or cpr_even
    if (cpr_new) {
        updatePosition(Modes, a, mm);
    }

    if (mm->sbs_in && mm->decoded_lat != 0 && mm->decoded_lon != 0) {
        if (accept_data(Modes, &a->position_valid, mm->source, mm, 0)) {
            a->meta.lat = mm->decoded_lat;
            a->meta.lon = mm->decoded_lon;

            a->pos_reliable_odd = 2;
            a->pos_reliable_even = 2;
        }
    }


    if (mm->msgtype == 11 && mm->IID == 0 && mm->correctedbits == 0 && messageNow() > a->next_reduce_forward_DF11) {

        a->next_reduce_forward_DF11 = messageNow() + Modes->net_output_beast_reduce_interval * 4;
        mm->reduce_forward = 1;
    }

    return (a);
}

//
// Periodic updates of tracking state
//

// Periodically match up mode A/C results with mode S results

static void trackMatchAC(struct _Modes *Modes, uint64_t now) {
    // clear match flags
    for (unsigned i = 0; i < 4096; ++i) {
        modeAC_match[i] = 0;
    }

    // scan aircraft list, look for matches
    for (int j = 0; j < AIRCRAFTS_BUCKETS; j++) {
        for (struct aircraft *a = Modes->aircrafts[j]; a; a = a->next) {
            if ((now - a->meta.seen) > 5000) {
                continue;
            }

            // match on Mode A
            if (trackDataValid(&a->squawk_valid)) {
                unsigned i = modeAToIndex(a->meta.squawk);
                if ((modeAC_count[i] - modeAC_lastcount[i]) >= TRACK_MODEAC_MIN_MESSAGES) {
                    a->modeA_hit = 1;
                    modeAC_match[i] = (modeAC_match[i] ? 0xFFFFFFFF : a->meta.addr);
                }
            }

            // match on Mode C (+/- 100ft)
            if (trackDataValid(&a->altitude_baro_valid)) {
                int modeC = (a->meta.alt_baro + 49) / 100;

                unsigned modeA = modeCToModeA(modeC);
                unsigned i = modeAToIndex(modeA);
                if (modeA && (modeAC_count[i] - modeAC_lastcount[i]) >= TRACK_MODEAC_MIN_MESSAGES) {
                    a->modeC_hit = 1;
                    modeAC_match[i] = (modeAC_match[i] ? 0xFFFFFFFF : a->meta.addr);
                }

                modeA = modeCToModeA(modeC + 1);
                i = modeAToIndex(modeA);
                if (modeA && (modeAC_count[i] - modeAC_lastcount[i]) >= TRACK_MODEAC_MIN_MESSAGES) {
                    a->modeC_hit = 1;
                    modeAC_match[i] = (modeAC_match[i] ? 0xFFFFFFFF : a->meta.addr);
                }

                modeA = modeCToModeA(modeC - 1);
                i = modeAToIndex(modeA);
                if (modeA && (modeAC_count[i] - modeAC_lastcount[i]) >= TRACK_MODEAC_MIN_MESSAGES) {
                    a->modeC_hit = 1;
                    modeAC_match[i] = (modeAC_match[i] ? 0xFFFFFFFF : a->meta.addr);
                }
            }
        }
    }

    // reset counts for next time
    for (unsigned i = 0; i < 4096; ++i) {
        if (!modeAC_count[i])
            continue;

        if ((modeAC_count[i] - modeAC_lastcount[i]) < TRACK_MODEAC_MIN_MESSAGES) {
            if (++modeAC_age[i] > 15) {
                // not heard from for a while, clear it out
                modeAC_lastcount[i] = modeAC_count[i] = modeAC_age[i] = 0;
            }
        } else {
            // this one is live
            // set a high initial age for matches, so they age out rapidly
            // and don't show up on the interactive display when the matching
            // mode S data goes away or changes
            if (modeAC_match[i]) {
                modeAC_age[i] = 10;
            } else {
                modeAC_age[i] = 0;
            }
        }

        modeAC_lastcount[i] = modeAC_count[i];
    }
}

//
//=========================================================================
//
// If we don't receive new nessages within TRACK_AIRCRAFT_TTL
// we remove the aircraft from the list.
//

static void trackRemoveStaleAircraft(struct _Modes *Modes, uint64_t now) {
    MODES_NOTUSED(Modes);
    for (int j = 0; j < AIRCRAFTS_BUCKETS; j++) {
        struct aircraft *a = Modes->aircrafts[j];
        struct aircraft *prev = NULL;

        while (a) {
            if ((now - a->meta.seen) > TRACK_AIRCRAFT_TTL ||
                    (a->meta.messages == 1 && (now - a->meta.seen) > TRACK_AIRCRAFT_ONEHIT_TTL)) {
                // Count aircraft where we saw only one message before reaping them.
                // These are likely to be due to messages with bad addresses.
                if (a->meta.messages == 1)
                    Modes->stats_current.single_message_aircraft++;

                // Remove the element from the linked list, with care
                // if we are removing the first element
                if (!prev) {
                    Modes->aircrafts[j] = a->next;
                    free(a);
                    a = Modes->aircrafts[j];
                } else {
                    prev->next = a->next;
                    free(a);
                    a = prev->next;
                }
            } else {

#define EXPIRE(_f) do { if (a->_f##_valid.source != SOURCE_INVALID && now >= a->_f##_valid.expires) { a->_f##_valid.source = SOURCE_INVALID; } } while (0)
                EXPIRE(callsign);
                EXPIRE(altitude_baro);
                EXPIRE(altitude_geom);
                EXPIRE(geom_delta);
                EXPIRE(gs);
                EXPIRE(ias);
                EXPIRE(tas);
                EXPIRE(mach);
                EXPIRE(track);
                EXPIRE(track_rate);
                EXPIRE(roll);
                EXPIRE(mag_heading);
                EXPIRE(true_heading);
                EXPIRE(baro_rate);
                EXPIRE(geom_rate);
                EXPIRE(squawk);
                EXPIRE(airground);
                EXPIRE(nav_qnh);
                EXPIRE(nav_altitude_mcp);
                EXPIRE(nav_altitude_fms);
                EXPIRE(nav_altitude_src);
                EXPIRE(nav_heading);
                EXPIRE(nav_modes);
                EXPIRE(cpr_odd);
                EXPIRE(cpr_even);
                EXPIRE(position);
                EXPIRE(nic_a);
                EXPIRE(nic_c);
                EXPIRE(nic_baro);
                EXPIRE(nac_p);
                EXPIRE(sil);
                EXPIRE(gva);
                EXPIRE(sda);
#undef EXPIRE

                // reset position reliability when the position has expired
                if (a->position_valid.source == SOURCE_INVALID) {
                    a->pos_reliable_odd = 0;
                    a->pos_reliable_even = 0;
                }

                if (a->altitude_baro_valid.source == SOURCE_INVALID)
                    a->altitude_baro_reliable = 0;

                prev = a;
                a = a->next;
            }
        }
    }
}


//
// Entry point for periodic updates
//

void trackPeriodicUpdate(struct _Modes *Modes) {
    static uint64_t next_update;
    uint64_t now = mstime();

    // Only do updates once per second
    if (now >= next_update) {
        next_update = now + 1000;
        trackRemoveStaleAircraft(Modes, now);
        if (Modes->mode_ac) {
            trackMatchAC(Modes, now);
        }
    }
}
