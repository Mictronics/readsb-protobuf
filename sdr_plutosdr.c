// Part of readsb, a Mode-S/ADSB/TIS message decoder.
//
// sdr_pluto.c: PlutoSDR support
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

#include <iio.h>
#include <ad9361.h>
#include "readsb.h"
#include "sdr_plutosdr.h"

static struct {
    input_format_t input_format;
    int dev_index;
    struct iio_channel *rx0_i;
    struct iio_channel *rx0_q;
    struct iio_buffer *rxbuf;
    struct iio_context *ctx;
    struct iio_device *dev;
    int16_t *readbuf;
    iq_convert_fn converter;
    struct converter_state *converter_state;
    char *uri;
    char *network;
} PLUTOSDR;

void plutosdrInitConfig() {
    PLUTOSDR.readbuf = NULL;
    PLUTOSDR.converter = NULL;
    PLUTOSDR.converter_state = NULL;
    PLUTOSDR.uri = NULL;
    PLUTOSDR.network = NULL;
}

bool plutosdrHandleOption(int argc, char *argv) {
    switch (argc) {
        case OptPlutoUri:
            PLUTOSDR.uri = strdup(argv);
            break;
        case OptPlutoNetwork:
            PLUTOSDR.network = strdup(argv);
            break;
    }
    return true;
}

bool plutosdrOpen() {
    PLUTOSDR.network = strdup("pluto.local");
    PLUTOSDR.ctx = iio_create_default_context();
    if (PLUTOSDR.ctx == NULL && PLUTOSDR.uri != NULL) {
        PLUTOSDR.ctx = iio_create_context_from_uri(PLUTOSDR.uri);
    } else if (PLUTOSDR.ctx == NULL) {
        PLUTOSDR.ctx = iio_create_network_context(PLUTOSDR.network);
    }

    if (PLUTOSDR.ctx == NULL) {
        char buf[1024];
        iio_strerror(errno, buf, sizeof (buf));
        fprintf(stderr, "plutosdr: Failed creating IIO context: %s\n", buf);
        return false;
    }

    struct iio_scan_context *ctx;
    struct iio_context_info **info;
    ctx = iio_create_scan_context(NULL, 0);
    if (ctx) {
        int info_count = iio_scan_context_get_info_list(ctx, &info);
        if (info_count > 0) {
            fprintf(stderr, "plutosdr: %s\n", iio_context_info_get_description(info[0]));
            iio_context_info_list_free(info);
        }
        iio_scan_context_destroy(ctx);
    }

    int device_count = iio_context_get_devices_count(PLUTOSDR.ctx);
    if (!device_count) {
        fprintf(stderr, "plutosdr: No supported PLUTOSDR devices found.\n");
        plutosdrClose();
    }
    fprintf(stderr, "plutosdr: Context has %d device(s).\n", device_count);

    PLUTOSDR.dev = iio_context_find_device(PLUTOSDR.ctx, "cf-ad9361-lpc");

    if (PLUTOSDR.dev == NULL) {
        fprintf(stderr, "plutosdr: Error opening the PLUTOSDR device: %s\n", strerror(errno));
        plutosdrClose();
    }

    struct iio_channel* phy_chn = iio_device_find_channel(iio_context_find_device(PLUTOSDR.ctx, "ad9361-phy"), "voltage0", false);
    iio_channel_attr_write(phy_chn, "rf_port_select", "A_BALANCED");
    iio_channel_attr_write_longlong(phy_chn, "rf_bandwidth", (long long) 1750000);
    iio_channel_attr_write_longlong(phy_chn, "sampling_frequency", (long long) Modes.sample_rate);

    if (Modes.gain == MODES_AUTO_GAIN) {
        iio_channel_attr_write(phy_chn, "gain_control_mode", "slow_attack");
    } else {
        // We use 10th of dB here, max is 77dB up to 1300MHz
        if (Modes.gain > 770)
            Modes.gain = 770;
        iio_channel_attr_write(phy_chn, "gain_control_mode", "manual");
        iio_channel_attr_write_longlong(phy_chn, "hardwaregain", Modes.gain / 10);
    }

    iio_channel_attr_write_bool(
            iio_device_find_channel(iio_context_find_device(PLUTOSDR.ctx, "ad9361-phy"), "altvoltage1", true)
            , "powerdown", true); // Turn OFF TX LO

    iio_channel_attr_write_longlong(
            iio_device_find_channel(iio_context_find_device(PLUTOSDR.ctx, "ad9361-phy"), "altvoltage0", true)
            , "frequency", (long long) Modes.freq); // Set RX LO frequency

    PLUTOSDR.rx0_i = iio_device_find_channel(PLUTOSDR.dev, "voltage0", false);
    if (!PLUTOSDR.rx0_i)
        PLUTOSDR.rx0_i = iio_device_find_channel(PLUTOSDR.dev, "altvoltage0", false);

    PLUTOSDR.rx0_q = iio_device_find_channel(PLUTOSDR.dev, "voltage1", false);
    if (!PLUTOSDR.rx0_q)
        PLUTOSDR.rx0_q = iio_device_find_channel(PLUTOSDR.dev, "altvoltage1", false);

    ad9361_set_bb_rate(iio_context_find_device(PLUTOSDR.ctx, "ad9361-phy"), Modes.sample_rate);

    iio_channel_enable(PLUTOSDR.rx0_i);
    iio_channel_enable(PLUTOSDR.rx0_q);

    PLUTOSDR.rxbuf = iio_device_create_buffer(PLUTOSDR.dev, MODES_MAG_BUF_SAMPLES, false);

    if (!PLUTOSDR.rxbuf) {
        perror("plutosdr: Could not create RX buffer");
    }

    if (!(PLUTOSDR.readbuf = malloc(MODES_RTL_BUF_SIZE * 4))) {
        fprintf(stderr, "plutosdr: Failed to allocate read buffer\n");
        plutosdrClose();
        return false;
    }

    PLUTOSDR.converter = init_converter(INPUT_SC16,
            Modes.sample_rate,
            Modes.dc_filter,
            &PLUTOSDR.converter_state);
    if (!PLUTOSDR.converter) {
        fprintf(stderr, "plutosdr: Can't initialize sample converter\n");
        plutosdrClose();
        return false;
    }
    return true;
}

static void plutosdrCallback(int16_t *buf, uint32_t len) {
    static unsigned dropped = 0;
    static uint64_t sampleCounter = 0;

    sdrMonitor();
    
    unsigned samples_read = len / 2; // Drops any trailing odd sample, not much else we can do there
    if (!samples_read)
        return; // that wasn't useful

    struct mag_buf *outbuf = fifo_acquire(0 /* don't wait */);
    if (!outbuf) {
        // FIFO is full. Drop this block.
        dropped += samples_read;
        sampleCounter += samples_read;
        return;
    }

    outbuf->flags = 0;

    if (dropped) {
        // We previously dropped some samples due to no buffers being available
        outbuf->flags |= MAGBUF_DISCONTINUOUS;
        outbuf->dropped = dropped;
    }

    dropped = 0;

    outbuf->sampleTimestamp = sampleCounter * 12e6 / Modes.sample_rate;
    sampleCounter += samples_read;
    uint64_t block_duration = 1e3 * samples_read / Modes.sample_rate;
    outbuf->sysTimestamp = mstime() - block_duration;

     // Convert the new data
    unsigned to_convert = samples_read;
    if (to_convert + outbuf->overlap > outbuf->totalLength) {
        // how did that happen?
        to_convert = outbuf->totalLength - outbuf->overlap;
        dropped = samples_read - to_convert;
    }

    PLUTOSDR.converter(buf, &outbuf->data[outbuf->overlap], to_convert, PLUTOSDR.converter_state, &outbuf->mean_level, &outbuf->mean_power);
    outbuf->validLength = outbuf->overlap + to_convert;

    // Push to the demodulation thread
    fifo_enqueue(outbuf);
}

void plutosdrRun() {
    void *p_dat, *p_end;
    ptrdiff_t p_inc;

    if (!PLUTOSDR.dev) {
        return;
    }

    while (!Modes.exit) {
        int16_t *p = PLUTOSDR.readbuf;
        uint32_t len = (uint32_t) iio_buffer_refill(PLUTOSDR.rxbuf) / 2;
        p_inc = iio_buffer_step(PLUTOSDR.rxbuf);
        p_end = iio_buffer_end(PLUTOSDR.rxbuf);
        p_dat = iio_buffer_first(PLUTOSDR.rxbuf, PLUTOSDR.rx0_i);

        for (p_dat = iio_buffer_first(PLUTOSDR.rxbuf, PLUTOSDR.rx0_i); p_dat < p_end; p_dat += p_inc) {
            *p++ = ((int16_t*) p_dat)[0]; // Real (I)
            *p++ = ((int16_t*) p_dat)[1]; // Imag (Q)
        }
        plutosdrCallback(PLUTOSDR.readbuf, len);
    }
}

void plutosdrClose() {
    if (PLUTOSDR.readbuf) {
        free(PLUTOSDR.readbuf);
    }

    if (PLUTOSDR.rxbuf) {
        iio_buffer_destroy(PLUTOSDR.rxbuf);
    }

    if (PLUTOSDR.rx0_i) {
        iio_channel_disable(PLUTOSDR.rx0_i);
    }

    if (PLUTOSDR.rx0_q) {
        iio_channel_disable(PLUTOSDR.rx0_q);
    }

    if (PLUTOSDR.ctx) {
        iio_context_destroy(PLUTOSDR.ctx);
    }

    free(PLUTOSDR.network);
    free(PLUTOSDR.uri);
}
