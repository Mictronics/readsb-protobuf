"use strict";
var READSB;
(function (READSB) {
    class NightDayLayer extends L.Polygon {
        constructor(options) {
            super([], options);
            this.r2d = 180 / Math.PI;
            this.d2r = Math.PI / 180;
            L.Util.setOptions(this, options);
            const latlngs = this.compute(this.options.time);
            this.setLatLngs(latlngs);
            this.intervalTimer = window.setInterval(this.SetTime.bind(this), 5000);
        }
        SetTime(date) {
            this.options.time = date;
            const latlngs = this.compute(date);
            this.setLatLngs(latlngs);
        }
        sunEclipticPosition(julianDay) {
            const n = julianDay - 2451545.0;
            let L$$1 = 280.46 + 0.9856474 * n;
            L$$1 %= 360;
            let g = 357.528 + 0.9856003 * n;
            g %= 360;
            const lambda = L$$1 +
                1.915 * Math.sin(g * this.d2r) +
                0.02 * Math.sin(2 * g * this.d2r);
            const R = 1.00014 -
                0.01671 * Math.cos(g * this.d2r) -
                0.0014 * Math.cos(2 * g * this.d2r);
            return { lambda, R };
        }
        eclipticObliquity(julianDay) {
            const n = julianDay - 2451545.0;
            const T = n / 36525;
            const epsilon = 23.43929111 -
                T *
                    (46.836769 / 3600 -
                        T *
                            (0.0001831 / 3600 +
                                T *
                                    (0.0020034 / 3600 -
                                        T * (0.576e-6 / 3600 - (T * 4.34e-8) / 3600))));
            return epsilon;
        }
        sunEquatorialPosition(sunEclLng, eclObliq) {
            let alpha = Math.atan(Math.cos(eclObliq * this.d2r) * Math.tan(sunEclLng * this.d2r)) * this.r2d;
            const delta = Math.asin(Math.sin(eclObliq * this.d2r) * Math.sin(sunEclLng * this.d2r)) * this.r2d;
            const lQuadrant = Math.floor(sunEclLng / 90) * 90;
            const raQuadrant = Math.floor(alpha / 90) * 90;
            alpha = alpha + (lQuadrant - raQuadrant);
            return { alpha, delta };
        }
        hourAngle(lng, sunPos, gst) {
            const lst = gst + lng / 15;
            return lst * 15 - sunPos.alpha;
        }
        latitude(ha, sunPos) {
            const lat = Math.atan(-Math.cos(ha * this.d2r) / Math.tan(sunPos.delta * this.d2r)) * this.r2d;
            return lat;
        }
        compute(time) {
            let today = Date.now();
            if (time !== null && time !== undefined) {
                today = new Date(time).valueOf();
            }
            const julianDay = today / 86400000 + 2440587.5;
            const gst = (18.697374558 + 24.06570982441908 * (julianDay - 2451545.0)) % 24;
            const latLng = [];
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
            }
            else {
                latLng[0] = [-90, -360];
                latLng[latLng.length] = [-90, 360];
            }
            return latLng;
        }
    }
    L.nightDayLayer = (options) => new NightDayLayer(options);
})(READSB || (READSB = {}));
//# sourceMappingURL=leaflet-nightday.js.map