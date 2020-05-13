"use strict";
self.importScripts("../../pbf.js");
self.importScripts("../../subworkers.js");
self.importScripts("../enums.js");
self.importScripts("database.js");
self.importScripts("registration.js");
self.importScripts("flags.js");
self.importScripts("aircraft.js");
self.importScripts("readsb-pb.js");
var READSB;
(function (READSB) {
    class AircraftCollection {
        static Init() {
            self.addEventListener("message", this.OnFrontendMessage.bind(this));
            READSB.Registration.Init();
            this.collectionStatistic = {
                MessageRate: 0,
                Now: 0,
                Refresh: 0,
                TrackedAircraftPositions: 0,
                TrackedAircraftUnknown: 0,
                TrackedAircrafts: 0,
                TrackedHistorySize: 0,
                Version: "Unknown",
            };
            this.aircraftTraceCollector.postMessage({ type: "HistoryPort", data: this.subWorkerMessageChannel.port1 }, [this.subWorkerMessageChannel.port1]);
            this.aircraftHistoryLoader.postMessage({ type: "Port", data: this.subWorkerMessageChannel.port2 }, [this.subWorkerMessageChannel.port2]);
            this.worker.postMessage({ type: "Port", data: this.frontEndMessageChannel.port1 }, [this.frontEndMessageChannel.port1]);
            this.aircraftTraceCollector.postMessage({ type: "FrontendPort", data: this.frontEndMessageChannel.port2 }, [this.frontEndMessageChannel.port2]);
            fetch("../../../data/receiver.pb", {
                cache: "no-cache",
                method: "GET",
                mode: "cors",
            })
                .then((res) => {
                if (res.status >= 200 && res.status < 300) {
                    return Promise.resolve(res);
                }
                else {
                    return Promise.reject(new Error(res.statusText));
                }
            })
                .then((res) => {
                return res.arrayBuffer();
            })
                .then((pb) => {
                const pbf = new Pbf(new Uint8Array(pb));
                const msg = READSB.Receiver.read(pbf);
                pbf.destroy();
                if (msg.latitude && msg.longitude) {
                    this.worker.postMessage({
                        type: "ReceiverPosition", data: [
                            msg.latitude,
                            msg.longitude,
                            msg.antenna_flags,
                            msg.antenna_gps_sats,
                            msg.antenna_gps_hdop,
                        ],
                    });
                    this.sitePosition = { lat: msg.latitude, lng: msg.longitude };
                    this.SortBy(READSB.eSortBy.Distance);
                }
                else {
                    this.SortBy(READSB.eSortBy.Altitude);
                }
                this.collectionStatistic.Version = msg.version;
                this.collectionStatistic.Refresh = msg.refresh;
                this.aircraftHistoryLoader.postMessage({ type: "HistorySize", data: msg.history });
                self.setInterval(this.FetchData.bind(this), msg.refresh);
                self.setInterval(this.Clean.bind(this), 60000);
                if ((msg.antenna_flags & 0x8000) === 0x8000) {
                    self.setInterval(this.FetchReceiverStatus.bind(this), 30000);
                }
                this.FetchData();
                this.Clean();
            })
                .catch((error) => {
                this.receiverErrorCount++;
                this.worker.postMessage({ type: "Error", data: "error.fetchingData", error });
            });
            fetch("../../../data/stats.pb", {
                cache: "no-cache",
                method: "GET",
                mode: "cors",
            })
                .then((res) => {
                if (res.status >= 200 && res.status < 300) {
                    return Promise.resolve(res);
                }
                else {
                    return Promise.reject(new Error(res.statusText));
                }
            })
                .then((res) => {
                return res.arrayBuffer();
            })
                .then((pb) => {
                const pbf = new Pbf(new Uint8Array(pb));
                const msg = READSB.Statistics.read(pbf);
                pbf.destroy();
                if (msg.polar_range.length > 0) {
                    this.worker.postMessage({ type: "Range", data: msg.polar_range });
                }
            })
                .catch((error) => {
                this.receiverErrorCount++;
                this.worker.postMessage({ type: "Error", data: "error.fetchingData", error });
            });
        }
        static OnFrontendMessage(ev) {
            const msg = ev.data;
            switch (msg.type) {
                case "SitePosition":
                    this.sitePosition = { lat: msg.data[0], lng: msg.data[1] };
                    break;
                case "SortBy":
                    this.SortBy(msg.data);
                    break;
                case "Aircraft":
                    if (msg.data === "*") {
                        for (const [pos, icao] of this.aircraftIcaoList.entries()) {
                            this.worker.postMessage({ type: "Aircraft", data: [pos, this.aircraftCollection.get(icao)] });
                        }
                    }
                    else {
                        const pos = this.aircraftIcaoList.indexOf(msg.data);
                        if (this.aircraftCollection.has(msg.data)) {
                            this.worker.postMessage({ type: "Aircraft", data: [pos, this.aircraftCollection.get(msg.data)] });
                        }
                    }
                    break;
                default:
                    break;
            }
        }
        static FetchData() {
            if (this.fetchPending) {
                return;
            }
            this.fetchPending = true;
            fetch("../../../data/aircraft.pb", {
                cache: "no-cache",
                method: "GET",
                mode: "cors",
            })
                .then((res) => {
                if (res.status >= 200 && res.status < 300) {
                    return Promise.resolve(res);
                }
                else {
                    return Promise.reject(new Error(res.statusText));
                }
            })
                .then((res) => {
                return res.arrayBuffer();
            })
                .then((pb) => {
                const pbf = new Pbf(pb);
                const data = READSB.AircraftsUpdate.read(pbf);
                pbf.destroy();
                const now = data.now;
                if (this.messageCountHistory.length > 0 && this.messageCountHistory[this.messageCountHistory.length - 1].messages > data.messages) {
                    this.messageCountHistory = [{
                            messages: 0,
                            time: this.messageCountHistory[this.messageCountHistory.length - 1].time,
                        }];
                }
                this.messageCountHistory.push({ time: now, messages: data.messages });
                if ((now - this.messageCountHistory[0].time) > 30) {
                    this.messageCountHistory.shift();
                }
                this.Update(data, now);
                if (this.LastReceiverTimestamp === now) {
                    this.receiverErrorCount++;
                    if (this.receiverErrorCount > 5) {
                        this.worker.postMessage({ type: "Error", data: "error.dataTimeOut", error: null });
                    }
                }
                else if (this.receiverErrorCount > 0) {
                    this.receiverErrorCount = 0;
                    this.LastReceiverTimestamp = now;
                    this.worker.postMessage({ type: "Error", data: false });
                }
                this.fetchPending = false;
            })
                .catch((error) => {
                this.fetchPending = false;
                this.receiverErrorCount++;
                this.worker.postMessage({ type: "Error", data: "error.fetchingData", error });
                console.error(error);
            });
        }
        static FetchReceiverStatus() {
            fetch("../../../data/receiver.pb", {
                cache: "no-cache",
                method: "GET",
                mode: "cors",
            })
                .then((res) => {
                if (res.status >= 200 && res.status < 300) {
                    return Promise.resolve(res);
                }
                else {
                    return Promise.reject(new Error(res.statusText));
                }
            })
                .then((res) => {
                return res.arrayBuffer();
            })
                .then((pb) => {
                const pbf = new Pbf(new Uint8Array(pb));
                const msg = READSB.Receiver.read(pbf);
                pbf.destroy();
                if (msg.latitude && msg.longitude) {
                    this.worker.postMessage({
                        type: "ReceiverPosition", data: [
                            msg.latitude,
                            msg.longitude,
                            msg.antenna_flags,
                            msg.antenna_gps_sats,
                            msg.antenna_gps_hdop,
                        ],
                    });
                    this.sitePosition = { lat: msg.latitude, lng: msg.longitude };
                }
            })
                .catch((error) => {
                this.receiverErrorCount++;
                this.worker.postMessage({ type: "Error", data: "error.fetchingData", error });
            });
        }
        static GetMessageRate() {
            let messageRate = null;
            if (this.messageCountHistory.length > 1) {
                const messageTimeDelta = this.messageCountHistory[this.messageCountHistory.length - 1].time - this.messageCountHistory[0].time;
                const messageCountDelta = this.messageCountHistory[this.messageCountHistory.length - 1].messages - this.messageCountHistory[0].messages;
                if (messageTimeDelta > 0) {
                    messageRate = messageCountDelta / messageTimeDelta;
                }
            }
            else {
                messageRate = null;
            }
            return messageRate;
        }
        static Clean() {
            for (const [key, ac] of this.aircraftCollection) {
                if ((this.nowTimestamp - ac.LastMessageTime) > 300) {
                    const i = this.aircraftIcaoList.indexOf(ac.Icao);
                    this.aircraftIcaoList.splice(i, 1);
                    this.aircraftCollection.delete(key);
                }
            }
            this.aircraftTraceCollector.postMessage({ type: "Clean", data: this.nowTimestamp });
        }
        static GetDistance(latlng1, latlng2) {
            if (latlng1 === null || latlng2 === null) {
                return null;
            }
            const R = 6371000;
            const rad = Math.PI / 180;
            const lat1 = latlng1.lat * rad;
            const lat2 = latlng2.lat * rad;
            const sinDLat = Math.sin((latlng2.lat - latlng1.lat) * rad / 2);
            const sinDLon = Math.sin((latlng2.lng - latlng1.lng) * rad / 2);
            const a = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return R * c;
        }
        static Update(data, nowTimestamp) {
            this.nowTimestamp = nowTimestamp;
            this.collectionStatistic.TrackedAircrafts = 0;
            this.collectionStatistic.TrackedAircraftUnknown = 0;
            this.collectionStatistic.TrackedAircraftPositions = 0;
            this.collectionStatistic.TrackedHistorySize = 0;
            for (const ac of data.aircraft) {
                const hex = ac.addr.toString(16).padStart(6, "0");
                let entry = null;
                if (hex === "000000") {
                    continue;
                }
                if (this.aircraftIcaoList.includes(hex)) {
                    entry = this.aircraftCollection.get(hex);
                }
                else {
                    entry = new READSB.Aircraft(hex);
                    this.aircraftCollection.set(hex, entry);
                    this.aircraftIcaoList.push(hex);
                }
                entry.UpdateData(nowTimestamp, ac);
                if (entry.Position && entry.AltBaro) {
                    const pos = new Array(entry.Position.lat, entry.Position.lng, entry.AltBaro);
                    const msg = { type: "Update", data: [entry.Icao, pos, nowTimestamp] };
                    this.aircraftTraceCollector.postMessage(msg);
                    entry.HistorySize++;
                    if (this.sitePosition !== null) {
                        entry.SiteDist = this.GetDistance(this.sitePosition, entry.Position);
                    }
                }
                this.collectionStatistic.TrackedHistorySize += entry.HistorySize;
                if (entry.CivilMil === null) {
                    this.collectionStatistic.TrackedAircraftUnknown++;
                }
                if (entry.Position !== null && entry.SeenPos < 60) {
                    this.collectionStatistic.TrackedAircraftPositions++;
                }
            }
            this.ResortCollection();
            for (const [icao, ac] of this.aircraftCollection.entries()) {
                if (ac.UpdateVisibility(nowTimestamp)) {
                    this.collectionStatistic.TrackedAircrafts += 1;
                }
                this.worker.postMessage({ type: "Aircraft", data: [ac.SortPos, ac] });
            }
            this.worker.postMessage({ type: "Sort", data: this.aircraftIcaoList });
            this.collectionStatistic.MessageRate = this.GetMessageRate();
            this.worker.postMessage({ type: "Statistic", data: this.collectionStatistic });
        }
        static CompareAlpha(xa, ya) {
            if (xa === ya) {
                return 0;
            }
            if (xa < ya) {
                return -1;
            }
            return 1;
        }
        static CompareNumeric(xf, yf) {
            if (Math.abs(xf - yf) < 1e-9) {
                return 0;
            }
            return xf - yf;
        }
        static SortBy(sortby) {
            if (sortby === this.sortCriteria) {
                this.sortAscending = !this.sortAscending;
                this.aircraftIcaoList.reverse();
            }
            else {
                this.sortAscending = true;
            }
            this.sortCriteria = sortby;
            switch (sortby) {
                case READSB.eSortBy.Icao:
                    this.sortCompare = this.CompareAlpha;
                    this.sortExtract = (x) => {
                        return x.Icao;
                    };
                    break;
                case READSB.eSortBy.Flight:
                    this.sortCompare = this.CompareAlpha;
                    this.sortExtract = (x) => {
                        return x.Flight;
                    };
                    break;
                case READSB.eSortBy.Registration:
                    this.sortCompare = this.CompareAlpha;
                    this.sortExtract = (x) => {
                        return x.Registration;
                    };
                    break;
                case READSB.eSortBy.Type:
                    this.sortCompare = this.CompareAlpha;
                    this.sortExtract = (x) => {
                        return x.IcaoType;
                    };
                    break;
                case READSB.eSortBy.Squawk:
                    this.sortCompare = this.CompareAlpha;
                    this.sortExtract = (x) => {
                        return x.Squawk;
                    };
                    break;
                case READSB.eSortBy.Altitude:
                    this.sortCompare = this.CompareNumeric;
                    this.sortExtract = (x) => {
                        return (isNaN(x.Altitude) ? -1e9 : x.Altitude);
                    };
                    break;
                case READSB.eSortBy.Speed:
                    this.sortCompare = this.CompareNumeric;
                    this.sortExtract = (x) => {
                        return x.Speed;
                    };
                    break;
                case READSB.eSortBy.VerticalRate:
                    this.sortCompare = this.CompareNumeric;
                    this.sortExtract = (x) => {
                        return x.VertRate;
                    };
                    break;
                case READSB.eSortBy.Distance:
                    this.sortCompare = this.CompareNumeric;
                    this.sortExtract = (x) => {
                        return x.SiteDist;
                    };
                    break;
                case READSB.eSortBy.Track:
                    this.sortCompare = this.CompareNumeric;
                    this.sortExtract = (x) => {
                        return x.Track;
                    };
                    break;
                case READSB.eSortBy.Messages:
                    this.sortCompare = this.CompareNumeric;
                    this.sortExtract = (x) => {
                        return x.Messages;
                    };
                    break;
                case READSB.eSortBy.Seen:
                    this.sortCompare = this.CompareNumeric;
                    this.sortExtract = (x) => {
                        return x.Seen;
                    };
                    break;
                case READSB.eSortBy.Country:
                    this.sortCompare = this.CompareAlpha;
                    this.sortExtract = (x) => {
                        return x.IcaoRange.Country;
                    };
                    break;
                case READSB.eSortBy.Rssi:
                    this.sortCompare = this.CompareNumeric;
                    this.sortExtract = (x) => {
                        return x.Rssi;
                    };
                    break;
                case READSB.eSortBy.Latitude:
                    this.sortCompare = this.CompareNumeric;
                    this.sortExtract = (x) => {
                        return (x.Position !== null ? x.Position.lat : null);
                    };
                    break;
                case READSB.eSortBy.Longitude:
                    this.sortCompare = this.CompareNumeric;
                    this.sortExtract = (x) => {
                        return (x.Position !== null ? x.Position.lng : null);
                    };
                    break;
                case READSB.eSortBy.CivilMil:
                    this.sortCompare = this.CompareAlpha;
                    this.sortExtract = (x) => {
                        return x.CivilMil;
                    };
                    break;
            }
            this.ResortCollection();
        }
        static SortFunction(xs, ys) {
            const x = this.aircraftCollection.get(xs);
            const y = this.aircraftCollection.get(ys);
            const xv = x.SortValue;
            const yv = y.SortValue;
            if (x.Interesting === true) {
                return -1;
            }
            if (y.Interesting === true) {
                return 1;
            }
            if (this.specialSquawks.includes(x.Squawk)) {
                return -1;
            }
            if (this.specialSquawks.includes(y.Squawk)) {
                return 1;
            }
            if (xv === null && yv === null) {
                return x.SortPos - y.SortPos;
            }
            if (xv === null) {
                return 1;
            }
            if (yv === null) {
                return -1;
            }
            const c = this.sortAscending ? this.sortCompare(xv, yv) : this.sortCompare(yv, xv);
            if (c !== 0) {
                return c;
            }
            return x.SortPos - y.SortPos;
        }
        static ResortCollection() {
            let i = 0;
            for (const icao of this.aircraftIcaoList) {
                const ac = this.aircraftCollection.get(icao);
                ac.SortPos = i;
                ac.SortValue = this.sortExtract(ac);
                i++;
            }
            this.aircraftIcaoList.sort(this.SortFunction.bind(this));
        }
    }
    AircraftCollection.worker = self;
    AircraftCollection.aircraftTraceCollector = new self.Worker("aircraftTraces.js", { name: "AircraftTraceCollector" });
    AircraftCollection.aircraftHistoryLoader = new self.Worker("aircraftHistory.js", { name: "AircraftHistoryLoader" });
    AircraftCollection.subWorkerMessageChannel = new MessageChannel();
    AircraftCollection.frontEndMessageChannel = new MessageChannel();
    AircraftCollection.fetchPending = false;
    AircraftCollection.collectionStatistic = null;
    AircraftCollection.receiverErrorCount = 0;
    AircraftCollection.LastReceiverTimestamp = 0;
    AircraftCollection.messageCountHistory = [];
    AircraftCollection.nowTimestamp = 0;
    AircraftCollection.sortCriteria = READSB.eSortBy.Altitude;
    AircraftCollection.sortCompare = null;
    AircraftCollection.sortExtract = null;
    AircraftCollection.sortAscending = true;
    AircraftCollection.sitePosition = null;
    AircraftCollection.aircraftIcaoList = [];
    AircraftCollection.aircraftCollection = new Map();
    AircraftCollection.specialSquawks = [
        "0020",
        "0023",
        "0025",
        "0027",
        "0030",
        "0031",
        "0033",
        "0034",
        "0036",
        "1600",
        "7500",
        "7600",
        "7700",
    ];
    READSB.AircraftCollection = AircraftCollection;
    READSB.DatabaseBackend.Init();
})(READSB || (READSB = {}));
//# sourceMappingURL=aircraftCollection.js.map