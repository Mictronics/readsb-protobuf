// Part of readsb, a Mode-S/ADSB/TIS message decoder.
//
// aircraftHistory.ts: Aircraft history background worker.
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

self.importScripts("../../pbf.js");
self.importScripts("readsb-pb.js");

namespace READSB {
    let AircraftTraceCollector: MessagePort = null; // Message port to trace collector worker
    const PositionHistoryBuffer: IAircraftsUpdate[] = [];

    /**
     * Handle incoming messages from web frontend or trace collector worker.
     */
    self.onmessage = (ev: MessageEvent) => {
        const msg = ev.data;
        switch (msg.type) {
            case "Port":
                AircraftTraceCollector = msg.data;
                AircraftTraceCollector.onmessage = (evt: MessageEvent) => {
                    console.info(`TraceCollector: ${evt.data}`);
                };
                break;
            case "HistorySize":
                StartLoadHistory(msg.data);
                break;
            default:
                break;
        }
    };

    /**
     * Start loading aircraft history from readsb backend.
     * @param historySize Size of aircraft history.
     */
    function StartLoadHistory(historySize: number) {
        let loaded = 0;
        if (historySize > 0) {
            for (let i = 0; i < historySize; i++) {
                fetch(`../../../data/history_${i}.pb`, {
                    cache: "no-cache",
                    method: "GET",
                    mode: "cors",
                })
                    .then((res: Response) => {
                        loaded++;
                        if (res.status >= 200 && res.status < 400) {
                            return Promise.resolve(res);
                        } else {
                            return Promise.reject(res.statusText);
                        }
                    })
                    .then((res: Response) => {
                        return res.arrayBuffer();
                    }, (res: any) => {
                        loaded++;
                        console.error(`Failed to load history chunk: ${res.message}`);
                    })
                    .then((pb: ArrayBuffer) => {
                        if (loaded < 0) {
                            return;
                        }
                        const pbf = new Pbf(pb);
                        const data = AircraftsUpdate.read(pbf);
                        pbf.destroy();
                        PositionHistoryBuffer.push(data); // don't care for order, will sort later
                        if (loaded >= historySize) {
                            loaded = -1;
                            DoneLoadHistory();
                        }
                    })
                    .catch((error) => {
                        if (loaded < 0) {
                            return;
                        }
                        console.error(error.stack);
                        self.close();
                    });
            }
        }
    }

    /**
     * Forward history data to aircraft trace collector.
     */
    function DoneLoadHistory() {
        if (PositionHistoryBuffer.length > 0) {
            // Sort history by timestamp
            PositionHistoryBuffer.sort((x, y) => x.now - y.now);
            // Process history
            for (const h of PositionHistoryBuffer) {
                h.history.forEach((ac: IAircraftHistory, i: number) => {
                    if ((ac.lat !== null) && (ac.lon !== null) && (ac.alt_baro !== null)) {
                        const pos = new Array(ac.lat, ac.lon, ac.alt_baro);
                        const msg = { type: "Update", data: [ac.addr.toString(16).padStart(6, "0"), pos, h.now] };
                        AircraftTraceCollector.postMessage(msg);
                    }
                });
            }
        }
        // Job done, self terminated.
        self.close();
    }
}
