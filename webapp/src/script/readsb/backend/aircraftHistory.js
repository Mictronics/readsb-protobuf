"use strict";
self.importScripts("../../pbf.js");
self.importScripts("readsb-pb.js");
var READSB;
(function (READSB) {
    let AircraftTraceCollector = null;
    const PositionHistoryBuffer = [];
    self.onmessage = (ev) => {
        const msg = ev.data;
        switch (msg.type) {
            case "Port":
                AircraftTraceCollector = msg.data;
                AircraftTraceCollector.onmessage = (evt) => {
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
    function StartLoadHistory(historySize) {
        let loaded = 0;
        if (historySize > 0) {
            for (let i = 0; i < historySize; i++) {
                fetch(`../../../data/history_${i}.pb`, {
                    cache: "no-cache",
                    method: "GET",
                    mode: "cors",
                })
                    .then((res) => {
                    loaded++;
                    if (res.status >= 200 && res.status < 400) {
                        return Promise.resolve(res);
                    }
                    else {
                        return Promise.reject(res.statusText);
                    }
                })
                    .then((res) => {
                    return res.arrayBuffer();
                }, (res) => {
                    loaded++;
                    console.error(`Failed to load history chunk: ${res.message}`);
                })
                    .then((pb) => {
                    if (loaded < 0) {
                        return;
                    }
                    const pbf = new Pbf(pb);
                    const data = READSB.AircraftsUpdate.read(pbf);
                    pbf.destroy();
                    PositionHistoryBuffer.push(data);
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
    function DoneLoadHistory() {
        if (PositionHistoryBuffer.length > 0) {
            PositionHistoryBuffer.sort((x, y) => x.now - y.now);
            for (const h of PositionHistoryBuffer) {
                h.history.forEach((ac, i) => {
                    if ((ac.lat !== null) && (ac.lon !== null) && (ac.alt_baro !== null)) {
                        const pos = new Array(ac.lat, ac.lon, ac.alt_baro);
                        const msg = { type: "Update", data: [ac.addr.toString(16).padStart(6, "0"), pos, h.now] };
                        AircraftTraceCollector.postMessage(msg);
                    }
                });
            }
        }
        self.close();
    }
})(READSB || (READSB = {}));
//# sourceMappingURL=aircraftHistory.js.map