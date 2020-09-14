#ifndef READSB_STATION_H
#define READSB_STATION_H

#include "readsb.h"
#include "net_io.h"
#include "stats.h"
#include "cpr.h"
#include "convert.h"
#include "sdr.h"
#include "readsb.pb-c.h"
#include <stdatomic.h>
#include <semaphore.h>

void receiverPositionChanged (float lat, float lon, float alt);

#endif //READSB_STATION_H
