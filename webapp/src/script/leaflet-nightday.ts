// Part of readsb, a Mode-S/ADSB/TIS message decoder.
//
// leaflet-nightday.ts: Creates a night&day layer on a leaflet map.
//
// Copyright (c) 2021 Michael Wolf <michael@mictronics.de>
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
// Typescript version based on leaflet.terminator by Joerg Dietrich
// See https://github.com/joergdietrich/Leaflet.Terminator
// Original released under MIT license.
//
// The MIT License (MIT)
//
// Copyright (c) 2013 Joerg Dietrich <astro@joergdietrich.com>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files(the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and / or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
namespace READSB {

    interface ISunPosition {
        alpha: number;
        delta: number;
    }

    class NightDayLayer extends L.Polygon implements L.NightDayLayer {
        public options: L.NightDayLayerOptions;
        private r2d = 180 / Math.PI;
        private d2r = Math.PI / 180;
        private intervalTimer: number;

        constructor(options?: L.NightDayLayerOptions) {
            super([], options);
            L.Util.setOptions(this, options);
            const latlngs = this.compute(this.options.time);
            this.setLatLngs(latlngs);
            this.intervalTimer = window.setInterval(this.SetTime.bind(this), 5000);
        }

        public SetTime(date?: Date) {
            this.options.time = date;
            const latlngs = this.compute(date);
            this.setLatLngs(latlngs);
        }

        private sunEclipticPosition(julianDay: number) {
            /* Compute the position of the Sun in ecliptic coordinates at julianDay.
             * See http://en.wikipedia.org/wiki/Position_of_the_Sun
             */
            // Days since start of J2000.0
            const n = julianDay - 2451545.0;
            // mean longitude of the Sun
            let L$$1 = 280.46 + 0.9856474 * n;
            L$$1 %= 360;
            // mean anomaly of the Sun
            let g = 357.528 + 0.9856003 * n;
            g %= 360;
            // ecliptic longitude of Sun
            const lambda =
                L$$1 +
                1.915 * Math.sin(g * this.d2r) +
                0.02 * Math.sin(2 * g * this.d2r);
            // distance from Sun in AU
            const R =
                1.00014 -
                0.01671 * Math.cos(g * this.d2r) -
                0.0014 * Math.cos(2 * g * this.d2r);
            return { lambda, R };
        }

        private eclipticObliquity(julianDay: number) {
            /* See short term expression in
             * http://en.wikipedia.org/wiki/Axial_tilt#Obliquity_of_the_ecliptic_.28Earth.27s_axial_tilt.29
             */
            const n = julianDay - 2451545.0;
            // Julian centuries since J2000.0
            const T = n / 36525;
            const epsilon =
                23.43929111 -
                T *
                (46.836769 / 3600 -
                    T *
                    (0.0001831 / 3600 +
                        T *
                        (0.0020034 / 3600 -
                            T * (0.576e-6 / 3600 - (T * 4.34e-8) / 3600))));
            return epsilon;
        }

        private sunEquatorialPosition(sunEclLng: number, eclObliq: number): ISunPosition {
            /* Compute the Sun's equatorial position from its ecliptic
             * position. Inputs are expected in degrees. Outputs are in
             * degrees as well.
             */
            let alpha =
                Math.atan(
                    Math.cos(eclObliq * this.d2r) * Math.tan(sunEclLng * this.d2r)
                ) * this.r2d;
            const delta =
                Math.asin(
                    Math.sin(eclObliq * this.d2r) * Math.sin(sunEclLng * this.d2r)
                ) * this.r2d;

            const lQuadrant = Math.floor(sunEclLng / 90) * 90;
            const raQuadrant = Math.floor(alpha / 90) * 90;
            alpha = alpha + (lQuadrant - raQuadrant);

            return { alpha, delta };
        }

        private hourAngle(lng: number, sunPos: ISunPosition, gst: number) {
            /* Compute the hour angle of the sun for a longitude on
             * Earth. Return the hour angle in degrees.
             */
            const lst = gst + lng / 15;
            return lst * 15 - sunPos.alpha;
        }

        private latitude(ha: number, sunPos: ISunPosition) {
            /* For a given hour angle and sun position, compute the
             * latitude of the terminator in degrees.
             */
            const lat =
                Math.atan(
                    -Math.cos(ha * this.d2r) / Math.tan(sunPos.delta * this.d2r)
                ) * this.r2d;
            return lat;
        }

        private compute(time?: any): L.LatLngExpression[] {
            let today = Date.now();
            if (time !== null && time !== undefined) {
                today = new Date(time).valueOf();
            }
            /* Calculate the present UTC Julian Date. Function is valid after
             * the beginning of the UNIX epoch 1970-01-01 and ignores leap
             * seconds.
             */
            const julianDay = today / 86400000 + 2440587.5;
            /* Calculate Greenwich Mean Sidereal Time according to
             * http://aa.usno.navy.mil/faq/docs/GAST.php
             */
            // Low precision equation is good enough for our purposes.
            const gst = (18.697374558 + 24.06570982441908 * (julianDay - 2451545.0)) % 24;
            const latLng: L.LatLngExpression[] = [];

            const sunEclPos = this.sunEclipticPosition(julianDay);
            const eclObliq = this.eclipticObliquity(julianDay);
            const sunEqPos = this.sunEquatorialPosition(sunEclPos.lambda, eclObliq);
            for (let i = 0; i <= 720 * this.options.resolution; i++) {
                const lng = -360 + i / this.options.resolution;
                const ha = this.hourAngle(lng, sunEqPos, gst);
                latLng[i + 1] = [this.latitude(ha, sunEqPos), lng];
            }
            if (sunEqPos.delta < 0) {
                latLng[0] = [90, -360];
                latLng[latLng.length] = [90, 360];
            } else {
                latLng[0] = [-90, -360];
                latLng[latLng.length] = [-90, 360];
            }
            return latLng;
        }
    }

    L.nightDayLayer = (options?) => new NightDayLayer(options);
}
