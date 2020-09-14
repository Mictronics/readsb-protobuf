// Part of readsb, a Mode-S/ADSB/TIS message decoder.
//
// sdr_beast.c: Mode-S Beast and GNS5894 support
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

#include <termios.h>
#include "readsb.h"
#include "sdr_beast.h"
#include "station.h"
#include <fcntl.h>
#include <sys/ioctl.h>
#include <signal.h>
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <unistd.h>
#include <errno.h>

static struct {
    bool filter_df045;
    bool filter_df1117;
    bool mode_ac;
    bool mlat_timestamp;
    bool fec;
    bool crc;
    uint16_t padding;
} BeastSettings;

static void beastSetOption(struct _Modes *Modes, char opt) {
    char optionsmsg[3] = {0x1a, '1', opt};
    if (write(Modes->beast_fd, optionsmsg, 3) < 3) {
        fprintf(stderr, "Beast failed to set option: %s\n", strerror(errno));
    }
}

void beastInitConfig(struct _Modes *Modes) {
    free(Modes->beast_serial);
    Modes->beast_serial = strdup("/dev/ttyUSB0");
    BeastSettings.filter_df045 = false;
    BeastSettings.filter_df1117 = false;
    BeastSettings.mode_ac = false;
    Modes->mode_ac = 0;
    BeastSettings.mlat_timestamp = true;
    BeastSettings.fec = true;
    BeastSettings.crc = true;
}

bool beastHandleOption(struct _Modes *Modes, int argc, char *argv) {
    switch (argc) {
        case OptBeastSerial:
            free(Modes->beast_serial);
            Modes->beast_serial = strdup(argv);
            break;
        case OptBeastDF1117:
            BeastSettings.filter_df1117 = true;
            break;
        case OptBeastDF045:
            BeastSettings.filter_df045 = true;
            break;
        case OptBeastMlatTimeOff:
            BeastSettings.mlat_timestamp = false;
            break;
        case OptBeastCrcOff:
            BeastSettings.crc = false;
            break;
        case OptBeastFecOff:
            BeastSettings.fec = false;
            break;
        case OptBeastModeAc:
            BeastSettings.mode_ac = true;
            Modes->mode_ac = 1;
            Modes->mode_ac_auto = 0;
            break;
    }
    return true;
}

bool beastOpen(struct _Modes *Modes) {
    struct termios tios;
    speed_t baud = B3000000;

    Modes->beast_fd = open(Modes->beast_serial, O_RDWR | O_NOCTTY);
    if (Modes->beast_fd < 0) {
        fprintf(stderr, "Failed to open serial device %s: %s\n",
                Modes->beast_serial, strerror(errno));
        fprintf(stderr, "In case of permission denied try: sudo chmod a+rw %s\nor permanent permission: sudo adduser readsb dialout\n", Modes->beast_serial);
        return false;
    }

    if (tcgetattr(Modes->beast_fd, &tios) < 0) {
        fprintf(stderr, "tcgetattr(%s): %s\n", Modes->beast_serial, strerror(errno));
        return false;
    }

    tios.c_iflag = IGNPAR;
    tios.c_oflag = 0;
    tios.c_lflag = 0;
    tios.c_cflag = CS8 | CRTSCTS;
    tios.c_cc[VMIN] = 11;
    tios.c_cc[VTIME] = 0;

    if (Modes->sdr_type == SDR_GNS) {
        baud = B921600;
    }

    if (cfsetispeed(&tios, baud) < 0) {
        fprintf(stderr, "Beast cfsetispeed(%s, %d): %s\n",
                Modes->beast_serial, baud, strerror(errno));
        return false;
    }

    if (cfsetospeed(&tios, baud) < 0) {
        fprintf(stderr, "Beast cfsetospeed(%s, %d): %s\n",
                Modes->beast_serial, baud, strerror(errno));
        return false;
    }

    tcflush(Modes->beast_fd, TCIFLUSH);

    if (tcsetattr(Modes->beast_fd, TCSANOW, &tios) < 0) {
        fprintf(stderr, "Beast tcsetattr(%s): %s\n",
                Modes->beast_serial, strerror(errno));
        return false;
    }

    if (Modes->sdr_type == SDR_MODESBEAST) {
        /* set options */
        beastSetOption(Modes, 'C'); /* use binary format */
        beastSetOption(Modes, 'H'); /* RTS enabled */

        if (BeastSettings.filter_df1117)
            beastSetOption(Modes, 'D'); /* enable DF11/17-only filter*/
        else
            beastSetOption(Modes, 'd'); /* disable DF11/17-only filter, deliver all messages */

        if (BeastSettings.mlat_timestamp)
            beastSetOption(Modes, 'E'); /* enable mlat timestamps */
        else
            beastSetOption(Modes, 'e'); /* disable mlat timestamps */

        if (BeastSettings.crc)
            beastSetOption(Modes, 'f'); /* enable CRC checks */
        else
            beastSetOption(Modes, 'F'); /* disable CRC checks */

        if (BeastSettings.filter_df045)
            beastSetOption(Modes, 'G'); /* enable DF0/4/5 filter */
        else
            beastSetOption(Modes, 'g'); /* disable DF0/4/5 filter, deliver all messages */

        if (Modes->nfix_crc || BeastSettings.fec)
            beastSetOption(Modes, 'i'); /* FEC enabled */
        else
            beastSetOption(Modes, 'I'); /* FEC disbled */

        if (Modes->mode_ac || BeastSettings.mode_ac)
            beastSetOption(Modes, 'J'); /* Mode A/C enabled */
        else
            beastSetOption(Modes, 'j'); /* Mode A/C disabled */
    }

    // Request firmware message from GNS HULC
    if (Modes->sdr_type == SDR_GNS) {
        char optionsmsg[4] = {'#', '0', '0', '\r'};
        if (write(Modes->beast_fd, optionsmsg, 4) < 4) {
            fprintf(stderr, "GNS HULC request firmware failed: %s\n", strerror(errno));
        }
    }

    /* Kick on handshake and start reception */
    int RTSDTR_flag = TIOCM_RTS | TIOCM_DTR;
    ioctl(Modes->beast_fd, TIOCMBIS, &RTSDTR_flag); //Set RTS&DTR pin

    if (Modes->sdr_type == SDR_MODESBEAST) {
        fprintf(stderr, "Running Mode-S Beast via USB.\n");
    } else {
        fprintf(stderr, "Running GNS HULC via USB.\n");
    }
    return true;
}

void beastRun() {

}

void beastClose() {
    /* Beast device will be closed in the main cleanup_and_exit function when
     * clients are freed.
     */
}
