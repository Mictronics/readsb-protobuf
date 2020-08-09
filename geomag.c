// Part of readsb, a Mode-S/ADSB/TIS message decoder.
//
// geomag.h: Geomagnetism calculator
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
//
// This file incorporates work from NOAA Software and Model Support and is
// based on WMM2020LegacyC.zip
//
// PROGRAM MAGPOINT (GEOMAG DRIVER)
//
//     Contact Information
//
//     Software and Model Support
//     	National Geophysical Data Center
//     	NOAA EGC/2
//     	325 Broadway
//     	Boulder, CO 80303 USA
//		Attn: Manoj Nair or Stefan Maus
//		Phone:  (303) 497-4642 or -6522
//		Email:  Manoj.C.Nair@Noaa.gov or Stefan.Maus@noaa.gov
//		Web: http://www.ngdc.noaa.gov/geomag/WMM/
//
//	 Sponsoring Government Agency
//	   National Geospatial-Intelligence Agency
//    	   PRG / CSAT, M.S. L-41
//    	   3838 Vogel Road
//    	   Arnold, MO 63010
//    	   Attn: Craig Rollins
//    	   Phone:  (314) 263-4186
//    	   Email:  Craig.M.Rollins@Nga.Mil
//
//      Original Program By:
//        Dr. John Quinn
//        FLEET PRODUCTS DIVISION, CODE N342
//        NAVAL OCEANOGRAPHIC OFFICE (NAVOCEANO)
//        STENNIS SPACE CENTER (SSC), MS 39522-5001
//
//		3/25/05 Version 2.0 Stefan Maus corrected 2 bugs:
//       - use %c instead of %s for character read
//		 - help text: positive inclination is downward
//		1/29/2010 Version 3.0 Manoj Nair
//		Converted floating variables from single precision to double
//		Changed : height above AMSL (WGS84) to Height above WGS84 Ellipsoid
//		Removed the NaN forcing at the geographic poles
//		A new function "my_isnan" for improved portablility
//
// Copyright Notice
//
// As required by 17 U.S.C. 403, third parties producing copyrighted works
// consisting predominantly of the material produced by U.S. government agencies
// must provide notice with such work(s) identifying the U.S. Government material
// incorporated and stating that such material is not subject to copyright
// protection within the United States. The information on government web pages
// is in the public domain and not subject to copyright protection within the
// United States unless specifically annotated otherwise (copyright may be held
// elsewhere). Foreign copyrights may apply.

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <time.h>
#include "geomag.h"

#define NaN log(-1.0)

/**
 * Hard coded world magnetic model
 * Epoch: 2020.0
 * Valid: 2020.0-2025.0
 * Model: WMM-2020
 * Model date: 12/10/2019 
 * https://www.ngdc.noaa.gov/geomag/WMM/soft.shtml#downloads
 */
const double epoch = 2020.0;

const struct {
    int n;
    int m;
    double gnm;
    double hnm;
    double dgnm;
    double dhnm;
} wmm_obj[] = {
    {1, 0, -29404.5, 0.0, 6.7, 0.0},
    {1, 1, -1450.7, 4652.9, 7.7, -25.1},
    {2, 0, -2500.0, 0.0, -11.5, 0.0},
    {2, 1, 2982.0, -2991.6, -7.1, -30.2},
    {2, 2, 1676.8, -734.8, -2.2, -23.9},
    {3, 0, 1363.9, 0.0, 2.8, 0.0},
    {3, 1, -2381.0, -82.2, -6.2, 5.7},
    {3, 2, 1236.2, 241.8, 3.4, -1.0},
    {3, 3, 525.7, -542.9, -12.2, 1.1},
    {4, 0, 903.1, 0.0, -1.1, 0.0},
    {4, 1, 809.4, 282.0, -1.6, 0.2},
    {4, 2, 86.2, -158.4, -6.0, 6.9},
    {4, 3, -309.4, 199.8, 5.4, 3.7},
    {4, 4, 47.9, -350.1, -5.5, -5.6},
    {5, 0, -234.4, 0.0, -0.3, 0.0},
    {5, 1, 363.1, 47.7, 0.6, 0.1},
    {5, 2, 187.8, 208.4, -0.7, 2.5},
    {5, 3, -140.7, -121.3, 0.1, -0.9},
    {5, 4, -151.2, 32.2, 1.2, 3.0},
    {5, 5, 13.7, 99.1, 1.0, 0.5},
    {6, 0, 65.9, 0.0, -0.6, 0.0},
    {6, 1, 65.6, -19.1, -0.4, 0.1},
    {6, 2, 73.0, 25.0, 0.5, -1.8},
    {6, 3, -121.5, 52.7, 1.4, -1.4},
    {6, 4, -36.2, -64.4, -1.4, 0.9},
    {6, 5, 13.5, 9.0, -0.0, 0.1},
    {6, 6, -64.7, 68.1, 0.8, 1.0},
    {7, 0, 80.6, 0.0, -0.1, 0.0},
    {7, 1, -76.8, -51.4, -0.3, 0.5},
    {7, 2, -8.3, -16.8, -0.1, 0.6},
    {7, 3, 56.5, 2.3, 0.7, -0.7},
    {7, 4, 15.8, 23.5, 0.2, -0.2},
    {7, 5, 6.4, -2.2, -0.5, -1.2},
    {7, 6, -7.2, -27.2, -0.8, 0.2},
    {7, 7, 9.8, -1.9, 1.0, 0.3},
    {8, 0, 23.6, 0.0, -0.1, 0.0},
    {8, 1, 9.8, 8.4, 0.1, -0.3},
    {8, 2, -17.5, -15.3, -0.1, 0.7},
    {8, 3, -0.4, 12.8, 0.5, -0.2},
    {8, 4, -21.1, -11.8, -0.1, 0.5},
    {8, 5, 15.3, 14.9, 0.4, -0.3},
    {8, 6, 13.7, 3.6, 0.5, -0.5},
    {8, 7, -16.5, -6.9, 0.0, 0.4},
    {8, 8, -0.3, 2.8, 0.4, 0.1},
    {9, 0, 5.0, 0.0, -0.1, 0.0},
    {9, 1, 8.2, -23.3, -0.2, -0.3},
    {9, 2, 2.9, 11.1, -0.0, 0.2},
    {9, 3, -1.4, 9.8, 0.4, -0.4},
    {9, 4, -1.1, -5.1, -0.3, 0.4},
    {9, 5, -13.3, -6.2, -0.0, 0.1},
    {9, 6, 1.1, 7.8, 0.3, -0.0},
    {9, 7, 8.9, 0.4, -0.0, -0.2},
    {9, 8, -9.3, -1.5, -0.0, 0.5},
    {9, 9, -11.9, 9.7, -0.4, 0.2},
    {10, 0, -1.9, 0.0, 0.0, 0.0},
    {10, 1, -6.2, 3.4, -0.0, -0.0},
    {10, 2, -0.1, -0.2, -0.0, 0.1},
    {10, 3, 1.7, 3.5, 0.2, -0.3},
    {10, 4, -0.9, 4.8, -0.1, 0.1},
    {10, 5, 0.6, -8.6, -0.2, -0.2},
    {10, 6, -0.9, -0.1, -0.0, 0.1},
    {10, 7, 1.9, -4.2, -0.1, -0.0},
    {10, 8, 1.4, -3.4, -0.2, -0.1},
    {10, 9, -2.4, -0.1, -0.1, 0.2},
    {10, 10, -3.9, -8.8, -0.0, -0.0},
    {11, 0, 3.0, 0.0, -0.0, 0.0},
    {11, 1, -1.4, -0.0, -0.1, -0.0},
    {11, 2, -2.5, 2.6, -0.0, 0.1},
    {11, 3, 2.4, -0.5, 0.0, 0.0},
    {11, 4, -0.9, -0.4, -0.0, 0.2},
    {11, 5, 0.3, 0.6, -0.1, -0.0},
    {11, 6, -0.7, -0.2, 0.0, 0.0},
    {11, 7, -0.1, -1.7, -0.0, 0.1},
    {11, 8, 1.4, -1.6, -0.1, -0.0},
    {11, 9, -0.6, -3.0, -0.1, -0.1},
    {11, 10, 0.2, -2.0, -0.1, 0.0},
    {11, 11, 3.1, -2.6, -0.1, -0.0},
    {12, 0, -2.0, 0.0, 0.0, 0.0},
    {12, 1, -0.1, -1.2, -0.0, -0.0},
    {12, 2, 0.5, 0.5, -0.0, 0.0},
    {12, 3, 1.3, 1.3, 0.0, -0.1},
    {12, 4, -1.2, -1.8, -0.0, 0.1},
    {12, 5, 0.7, 0.1, -0.0, -0.0},
    {12, 6, 0.3, 0.7, 0.0, 0.0},
    {12, 7, 0.5, -0.1, -0.0, -0.0},
    {12, 8, -0.2, 0.6, 0.0, 0.1},
    {12, 9, -0.5, 0.2, -0.0, -0.0},
    {12, 10, 0.1, -0.9, -0.0, -0.0},
    {12, 11, -1.1, -0.0, -0.0, 0.0},
    {12, 12, -0.3, 0.5, -0.1, -0.1}
};

#define MAXDEG  12
#define RE      6371.2
#define A       6378.137
#define B       6356.7523142
#define A2      (double)(A * A)
#define B2      (double)(B * B)
#define C2      (double)(A2 - B2)
#define A4      (double)(A2 * A2)
#define B4      (double)(B2 * B2)
#define C4      (double)(A4 - B4)

static double c[13][13], cd[13][13], tc[13][13], dp[13][13], snorm[169];
static double sp[13], cp[13], fn[13], fm[13], pp[13], k[13][13];
static double *p = snorm;

/**
 * Initialize library.
 * @return 0 on SUCCESS, 1 on ERROR
 */
int geomag_init() {
    /* Initialize geomag routine */
    int m, n, j, D1, D2;
    double flnmj;
    sp[0] = 0.0;
    cp[0] = *p = pp[0] = 1.0;
    dp[0][0] = 0.0;

    /* Read world magnetic model spherical harmonic coefficients */
    c[0][0] = 0.0;
    cd[0][0] = 0.0;

    for (int i = 0; i < 90; i++) {
        if (wmm_obj[i].n > MAXDEG) break;
        if (wmm_obj[i].m > wmm_obj[i].n || wmm_obj[i].m < 0.0) {
            fprintf(stderr, "Corrupt record %d in model wmm_string in geomag.c\n", i);
            return -1;
        }

        if (wmm_obj[i].m <= wmm_obj[i].n) {
            c[wmm_obj[i].m][wmm_obj[i].n] = wmm_obj[i].gnm;
            cd[wmm_obj[i].m][wmm_obj[i].n] = wmm_obj[i].dgnm;
            if (wmm_obj[i].m != 0) {
                c[wmm_obj[i].n][wmm_obj[i].m - 1] = wmm_obj[i].hnm;
                cd[wmm_obj[i].n][wmm_obj[i].m - 1] = wmm_obj[i].dhnm;
            }
        }
    }

    /* Convert Schmidt normalized Gauss coefficients to unnormalized */
    *snorm = 1.0;
    fm[0] = 0.0;
    for (n = 1; n <= MAXDEG; n++) {
        *(snorm + n) = *(snorm + n - 1)*(double) (2 * n - 1) / (double) n;
        j = 2;
        for (m = 0, D1 = 1, D2 = (n - m + D1) / D1; D2 > 0; D2--, m += D1) {
            k[m][n] = (double) (((n - 1)*(n - 1))-(m * m)) / (double) ((2 * n - 1)*(2 * n - 3));
            if (m > 0) {
                flnmj = (double) ((n - m + 1) * j) / (double) (n + m);
                *(snorm + n + m * 13) = *(snorm + n + (m - 1)*13) * sqrt(flnmj);
                j = 1;
                c[n][m - 1] = *(snorm + n + m * 13) * c[n][m - 1];
                cd[n][m - 1] = *(snorm + n + m * 13) * cd[n][m - 1];
            }
            c[m][n] = *(snorm + n + m * 13) * c[m][n];
            cd[m][n] = *(snorm + n + m * 13) * cd[m][n];
        }
        fn[n] = (double) (n + 1);
        fm[n] = (double) n;
    }
    k[1][1] = 0.0;

    return 0;
}

/**
 * Calculate geo magnetic paramters for given position and altitude.
 * @param alt Altitude above WGS84 ellipsoid in km
 * @param lat Latitude in decimal degrees
 * @param lon Longitude in decimal degrees
 * @param time Decimal year
 * @param dec https://en.wikipedia.org/wiki/Magnetic_declination
 * @param dip https://en.wikipedia.org/wiki/Magnetic_dip
 * @param ti Total intensity in nano Tesla nT
 * @param gv Grid variation
 * @return 0 on SUCCESS, 1 on ERROR
 */
int geomag_calc(double alt, double lat, double lon, double decimal_year, double *dec, double *dip, double *ti, double *gv) {
    time_t rawtime;
    struct tm *info;
    // Calculate decimal year when not provided.
    if (decimal_year < 0.0) {
        time(&rawtime);
        info = gmtime(&rawtime);
        decimal_year = epoch + ((double) info->tm_yday / 365.0);
    }

    double dt = decimal_year - epoch;
    double dtr = M_PI / 180.0;
    double rlon = lon*dtr;
    double rlat = lat*dtr;
    double srlon = sin(rlon);
    double srlat = sin(rlat);
    double crlon = cos(rlon);
    double crlat = cos(rlat);
    double srlat2 = srlat*srlat;
    double crlat2 = crlat*crlat;
    sp[1] = srlon;
    cp[1] = crlon;

    /* Convert from geodetic coordinates to spherical coordinates. */
    double q = sqrt(A2 - C2 * srlat2);
    double q1 = alt*q;
    double q2 = ((q1 + A2) / (q1 + B2))*((q1 + A2) / (q1 + B2));
    double ct = srlat / sqrt(q2 * crlat2 + srlat2);
    double st = sqrt(1.0 - (ct * ct));
    double r2 = (alt * alt) + 2.0 * q1 + (A4 - C4 * srlat2) / (q * q);
    double r = sqrt(r2);
    double d = sqrt(A2 * crlat2 + B2 * srlat2);
    double ca = (alt + d) / r;
    double sa = C2 * crlat * srlat / (r * d);

    int n, m, D3, D4;

    for (m = 2; m <= MAXDEG; m++) {
        sp[m] = sp[1] * cp[m - 1] + cp[1] * sp[m - 1];
        cp[m] = cp[1] * cp[m - 1] - sp[1] * sp[m - 1];
    }

    double aor = RE / r;
    double ar = aor*aor;
    double br = 0.0;
    double bt = 0.0;
    double bp = 0.0;
    double bpp = 0.0;
    double par, temp1, temp2, parp;

    for (n = 1; n <= MAXDEG; n++) {
        ar = ar*aor;
        for (m = 0, D3 = 1, D4 = (n + m + D3) / D3; D4 > 0; D4--, m += D3) {
            /* Compute unnormalized associated legendre polynomials
             * and derivatives via recursion relations.               
             */
            if (n == m) {
                *(p + n + m * 13) = st**(p + n - 1 + (m - 1)*13);
                dp[m][n] = st * dp[m - 1][n - 1] + ct**(p + n - 1 + (m - 1)*13);
                goto S50;
            }
            if (n == 1 && m == 0) {
                *(p + n + m * 13) = ct**(p + n - 1 + m * 13);
                dp[m][n] = ct * dp[m][n - 1] - st**(p + n - 1 + m * 13);
                goto S50;
            }
            if (n > 1 && n != m) {
                if (m > n - 2) *(p + n - 2 + m * 13) = 0.0;
                if (m > n - 2) dp[m][n - 2] = 0.0;
                *(p + n + m * 13) = ct**(p + n - 1 + m * 13) - k[m][n]**(p + n - 2 + m * 13);
                dp[m][n] = ct * dp[m][n - 1] - st**(p + n - 1 + m * 13) - k[m][n] * dp[m][n - 2];
            }
S50:
            /* Time adjust the gauss coefficients */
            tc[m][n] = c[m][n] + dt * cd[m][n];
            if (m != 0) tc[n][m - 1] = c[n][m - 1] + dt * cd[n][m - 1];
            /* Accumulate terms of the spherical harmonic expansions */
            par = ar**(p + n + m * 13);
            if (m == 0) {
                temp1 = tc[m][n] * cp[m];
                temp2 = tc[m][n] * sp[m];
            } else {
                temp1 = tc[m][n] * cp[m] + tc[n][m - 1] * sp[m];
                temp2 = tc[m][n] * sp[m] - tc[n][m - 1] * cp[m];
            }
            bt = bt - ar * temp1 * dp[m][n];
            bp += (fm[m] * temp2 * par);
            br += (fn[n] * temp1 * par);
            /* Special case: north/south geographic poles */
            if (st == 0.0 && m == 1) {
                if (n == 1) pp[n] = pp[n - 1];
                else pp[n] = ct * pp[n - 1] - k[m][n] * pp[n - 2];
                parp = ar * pp[n];
                bpp += (fm[m] * temp2 * parp);
            }
        }
    }

    if (st == 0.0) bp = bpp;
    else bp /= st;
    /* Rotate magnetic vector components from spherical to
     * geodetic coordinates.
     */
    double bx = -bt * ca - br*sa;
    double by = bp;
    double bz = bt * sa - br*ca;
    /* Compute declination (dec), inclination (dip) and
     * total intensity (ti).
     */
    double bh = sqrt((bx * bx)+(by * by));
    *ti = sqrt((bh * bh)+(bz * bz));
    *dec = atan2(by, bx) / dtr;
    *dip = atan2(bz, bh) / dtr;
    /* Compute magnetic grid variation if the current
     * geodetic position is in the arctic or antarctic
     * (i.e. glat > +55 degrees or glat < -55 degrees)
     * Otherwise, set magnetic grid variation to -999.0
     */
    *gv = -999.0;
    if (fabs(lat) >= 55.) {
        if (lat > 0.0 && lon >= 0.0) *gv = *dec - lon;
        if (lat > 0.0 && lon < 0.0) *gv = *dec + fabs(lon);
        if (lat < 0.0 && lon >= 0.0) *gv = *dec + lon;
        if (lat < 0.0 && lon < 0.0) *gv = *dec - fabs(lon);
        if (*gv > +180.0) *gv -= 360.0;
        if (*gv < -180.0) *gv += 360.0;
    }
    return 0;
}
