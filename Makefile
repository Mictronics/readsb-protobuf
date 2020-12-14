PROGNAME=readsb
READSB_VERSION='v4.0.2'

RTLSDR ?= no
BLADERF ?= no
PLUTOSDR ?= no
AGGRESSIVE ?= no
HAVE_BIASTEE ?= no

CPPFLAGS += -DMODES_READSB_VERSION=\"$(READSB_VERSION)\" -DMODES_READSB_VARIANT=\"Mictronics\" -D_GNU_SOURCE

DIALECT = -std=c11
CFLAGS += $(DIALECT) -O2 -g -W -D_DEFAULT_SOURCE -Wall -Werror -fno-common -Wmissing-declarations
LIBS = -pthread -lpthread -lm -lrt -lncurses -lprotobuf-c -lrrd
LDFLAGS = 

ifeq ($(AGGRESSIVE), yes)
  CPPFLAGS += -DALLOW_AGGRESSIVE
endif

ifeq ($(RTLSDR), yes)
  SDR_OBJ += sdr_rtlsdr.o
  CPPFLAGS += -DENABLE_RTLSDR

  ifeq ($(HAVE_BIASTEE), yes)
    CPPFLAGS += -DENABLE_RTLSDR_BIASTEE
  endif

  ifdef RTLSDR_PREFIX
    CPPFLAGS += -I$(RTLSDR_PREFIX)/include
    LDFLAGS += -L$(RTLSDR_PREFIX)/lib
  else
    CFLAGS += $(shell pkg-config --cflags librtlsdr)
    LDFLAGS += $(shell pkg-config --libs-only-L librtlsdr)
  endif

  ifeq ($(STATIC), yes)
    LIBS_SDR += -Wl,-Bstatic -lrtlsdr -Wl,-Bdynamic -lusb-1.0
  else
    LIBS_SDR += -lrtlsdr -lusb-1.0
  endif
endif

ifeq ($(BLADERF), yes)
  SDR_OBJ += sdr_bladerf.o sdr_ubladerf.o
  CPPFLAGS += -DENABLE_BLADERF
  CFLAGS += $(shell pkg-config --cflags libbladeRF)
  LIBS_SDR += $(shell pkg-config --libs libbladeRF)
endif

ifeq ($(PLUTOSDR), yes)
    SDR_OBJ += sdr_plutosdr.o
    CPPFLAGS += -DENABLE_PLUTOSDR
    CFLAGS += $(shell pkg-config --cflags libiio libad9361)
    LIBS_SDR += $(shell pkg-config --libs libiio libad9361)
endif

all: protoc readsb readsbrrd viewadsb

protoc: readsb.proto
	rm -f readsb.pb-c.c readsb.pb-c.h
	protoc-c --c_out=. $<

protoc-clean:
	rm -f readsb.pb-c.c readsb.pb-c.h

%.o: %.c *.h
	$(CC) $(CPPFLAGS) $(CFLAGS) -c $< -o $@

readsb.pb-c.o: readsb.proto
	protoc-c --c_out=. $<
	$(CC) $(CPPFLAGS) $(CFLAGS) -c readsb.pb-c.c -o $@

readsb: readsb.pb-c.o geomag.o readsb.o anet.o interactive.o mode_ac.o mode_s.o comm_b.o net_io.o crc.o demod_2400.o stats.o cpr.o icao_filter.o track.o util.o convert.o fifo.o sdr_ifile.o sdr_beast.o sdr.o ais_charset.o $(SDR_OBJ) $(COMPAT)
	$(CC) -g -o $@ $^ $(LDFLAGS) $(LIBS) $(LIBS_SDR) 

viewadsb: readsb.pb-c.o geomag.o viewadsb.o anet.o interactive.o mode_ac.o mode_s.o comm_b.o net_io.o crc.o stats.o cpr.o icao_filter.o track.o util.o ais_charset.o $(COMPAT)
	$(CC) -g -o $@ $^ $(LDFLAGS) $(LIBS)

readsbrrd: readsb.pb-c.o readsbrrd.o $(COMPAT)
	$(CC) -g -o $@ $^ $(LDFLAGS) $(LIBS)

clean:	protoc-clean
	rm -f *.o compat/clock_gettime/*.o compat/clock_nanosleep/*.o readsb readsbrrd viewadsb cprtests crctests convert_benchmark

test: cprtests
	./cprtests

cprtests: cpr.o cprtests.o
	$(CC) $(CPPFLAGS) $(CFLAGS) -g -o $@ $^ -lm

crctests: crc.c crc.h
	$(CC) $(CPPFLAGS) $(CFLAGS) -g -DCRCDEBUG -o $@ $<

benchmarks: convert_benchmark
	./convert_benchmark

oneoff/convert_benchmark: oneoff/convert_benchmark.o convert.o util.o
	$(CC) $(CPPFLAGS) $(CFLAGS) -g -o $@ $^ -lm

oneoff/decode_comm_b: oneoff/decode_comm_b.o comm_b.o ais_charset.o
	$(CC) $(CPPFLAGS) $(CFLAGS) -g -o $@ $^ -lm
