// Part of readsb, a Mode-S/ADSB/TIS message decoder.
//
// aircraftCollection.ts: Aircraft collection background worker.
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
self.importScripts("../enums.js");
self.importScripts("database.js");
self.importScripts("registration.js");
self.importScripts("flags.js");
self.importScripts("aircraft.js");
self.importScripts("readsb-pb.js");

namespace READSB {
    export class AircraftCollection {
        /**
         * Initialize aircraft collection worker.
         */
        public static Init() {
            // Ensure we can receive message from frontend.
            self.addEventListener("message", this.OnFrontendMessage.bind(this));
            // Init registration LUT...
            Registration.Init();
            // ...and statistics.
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
            // Setup message channel between history worker and trace collector worker for direct communication.
            this.aircraftTraceCollector.postMessage({ type: "HistoryPort", data: this.subWorkerMessageChannel.port1 }, [this.subWorkerMessageChannel.port1]);
            this.aircraftHistoryLoader.postMessage({ type: "Port", data: this.subWorkerMessageChannel.port2 }, [this.subWorkerMessageChannel.port2]);
            // Setup message channel between frontend and trace collector worker for direct communication.
            this.worker.postMessage({ type: "Port", data: this.frontEndMessageChannel.port1 }, [this.frontEndMessageChannel.port1]);
            this.aircraftTraceCollector.postMessage({ type: "FrontendPort", data: this.frontEndMessageChannel.port2 }, [this.frontEndMessageChannel.port2]);

            // Get receiver metadata, then continue with initialization
            fetch("../../../data/receiver.pb", {
                cache: "no-cache",
                method: "GET",
                mode: "cors",
            })
                .then((res: Response) => {
                    if (res.status >= 200 && res.status < 300) {
                        return Promise.resolve(res);
                    } else {
                        return Promise.reject(new Error(res.statusText));
                    }
                })
                .then((res: Response) => {
                    return res.arrayBuffer();
                })
                .then((pb: ArrayBuffer) => {
                    const pbf = new Pbf(new Uint8Array(pb));
                    const msg = Receiver.read(pbf);
                    pbf.destroy();
                    if (msg.latitude && msg.longitude) {
                        this.worker.postMessage({ type: "ReceiverPosition", data: [msg.latitude, msg.longitude] });
                        this.sitePosition = { lat: msg.latitude, lng: msg.longitude };
                        this.SortBy(eSortBy.Distance);
                    } else {
                        this.SortBy(eSortBy.Altitude);
                    }

                    this.collectionStatistic.Version = msg.version;
                    this.collectionStatistic.Refresh = msg.refresh;
                    // Start loading of history.
                    this.aircraftHistoryLoader.postMessage({ type: "HistorySize", data: msg.history });
                    // Setup our timer to poll from the server.
                    self.setInterval(this.FetchData.bind(this), msg.refresh);
                    // Setup timer to clean this aircraft collection frequently.
                    self.setInterval(this.Clean.bind(this), 60000);

                    // And kick off one refresh immediately and clean up history.
                    this.FetchData();
                    this.Clean();
                })
                .catch((error) => {
                    this.receiverErrorCount++;
                    this.worker.postMessage({ type: "Error", data: "error.fetchingData", error });
                });
        }

        private static worker: Worker = self as any; // See https://github.com/Microsoft/TypeScript/issues/20595#issuecomment-390359040
        private static aircraftTraceCollector = new self.Worker("aircraftTraces.js", { name: "AircraftTraceCollector" });
        private static aircraftHistoryLoader = new self.Worker("aircraftHistory.js", { name: "AircraftHistoryLoader" });
        private static subWorkerMessageChannel = new MessageChannel();
        private static frontEndMessageChannel = new MessageChannel();
        private static fetchPending: boolean = false;
        private static collectionStatistic: ICollectionStatistics = null;
        private static receiverErrorCount: number = 0;
        private static LastReceiverTimestamp: number = 0;
        private static messageCountHistory: IMessageCountHistory[] = [];
        private static nowTimestamp: number = 0;
        private static sortCriteria: eSortBy = eSortBy.Altitude;
        private static sortCompare: any = null;
        private static sortExtract: any = null;
        private static sortAscending: boolean = true;
        private static sitePosition: any = null;
        // Holds the sorted order of ICAO24 addresses from aircraftCollection.
        private static aircraftIcaoList: string[] = [];
        // Aircraft collection in (unsorted) order of addition.
        private static aircraftCollection = new Map<string, IAircraft>();
        /**
         * Special allocated squawks by ICAO, rest mainly in Germany.
         */
        private static specialSquawks: string[] = [
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

        /**
         * Handle incoming messages from web frontend or other workers.
         */
        private static OnFrontendMessage(ev: MessageEvent) {
            const msg = ev.data;
            switch (msg.type) {
                case "SitePosition":
                    this.sitePosition = { lat: msg.data[0], lng: msg.data[1] };
                    break;
                case "SortBy":
                    this.SortBy(msg.data as eSortBy);
                    break;
                case "Aircraft":
                    if (msg.data === "*") {
                        // Special get all case, e.g. on list refresh.
                        for (const [pos, icao] of this.aircraftIcaoList.entries()) {
                            this.worker.postMessage({ type: "Aircraft", data: [pos, this.aircraftCollection.get(icao)] });
                        }
                    } else {
                        // Get specific aircraft
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

        /**
         * Fetch data from readsb backend service.
         * Periodical called.
         */
        private static FetchData() {
            if (this.fetchPending) {
                // don't double up on fetches, let the last one resolve
                return;
            }

            this.fetchPending = true;
            fetch("../../../data/aircraft.pb", {
                cache: "no-cache",
                method: "GET",
                mode: "cors",
            })
                .then((res: Response) => {
                    if (res.status >= 200 && res.status < 300) {
                        return Promise.resolve(res);
                    } else {
                        return Promise.reject(new Error(res.statusText));
                    }
                })
                .then((res: Response) => {
                    return res.arrayBuffer();
                })
                .then((pb: ArrayBuffer) => {
                    const pbf = new Pbf(pb);
                    const data = AircraftsUpdate.read(pbf);
                    pbf.destroy();
                    const now = data.now;
                    // Detect stats reset
                    if (this.messageCountHistory.length > 0 && this.messageCountHistory[this.messageCountHistory.length - 1].messages > data.messages) {
                        this.messageCountHistory = [{
                            messages: 0,
                            time: this.messageCountHistory[this.messageCountHistory.length - 1].time,
                        }];
                    }

                    // Note the message count in the history
                    this.messageCountHistory.push({ time: now, messages: data.messages });
                    // and clean up any old values
                    if ((now - this.messageCountHistory[0].time) > 30) {
                        this.messageCountHistory.shift();
                    }

                    // Update aircraft data, timestamps, visibility, history track for all aircrafts.
                    this.Update(data, now);

                    // Check for stale receiver data
                    if (this.LastReceiverTimestamp === now) {
                        this.receiverErrorCount++;
                        if (this.receiverErrorCount > 5) {
                            this.worker.postMessage({ type: "Error", data: "error.dataTimeOut", error: null });
                        }
                    } else if (this.receiverErrorCount > 0) {
                        // Clear errors in case we accumulated some.
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

        /**
         * Calculate and return message rate.
         */
        private static GetMessageRate(): number {
            let messageRate: number = null;
            if (this.messageCountHistory.length > 1) {
                const messageTimeDelta = this.messageCountHistory[this.messageCountHistory.length - 1].time - this.messageCountHistory[0].time;
                const messageCountDelta = this.messageCountHistory[this.messageCountHistory.length - 1].messages - this.messageCountHistory[0].messages;
                if (messageTimeDelta > 0) {
                    messageRate = messageCountDelta / messageTimeDelta;
                }
            } else {
                messageRate = null;
            }
            return messageRate;
        }

        /**
         * Clean aircraft list periodical. Remove aircrafts not seen for more than 300 seconds.
         */
        private static Clean() {
            // Look for aircrafts where we have seen no messages for >300 seconds
            for (const [key, ac] of this.aircraftCollection) {
                if ((this.nowTimestamp - ac.LastMessageTime) > 300) {
                    // Delete it.
                    const i = this.aircraftIcaoList.indexOf(ac.Icao);
                    this.aircraftIcaoList.splice(i, 1);
                    this.aircraftCollection.delete(key);
                }
            }

            // Clean aircraft trace collection.
            this.aircraftTraceCollector.postMessage({ type: "Clean", data: this.nowTimestamp });
        }

        /**
         * Get distance between two coordinates.
         * @param latlng1 Coordinate frist point
         * @param latlng2 Coordinate second point
         */
        private static GetDistance(latlng1: any, latlng2: any) {
            if (latlng1 === null || latlng2 === null) {
                return null;
            }
            // Mean Earth Radius, as recommended for use by
            // the International Union of Geodesy and Geophysics,
            // see http://rosettacode.org/wiki/Haversine_formula
            const R = 6371000;
            // distance between two geographical points using spherical law of cosines approximation
            const rad = Math.PI / 180;
            const lat1 = latlng1.lat * rad;
            const lat2 = latlng2.lat * rad;
            const sinDLat = Math.sin((latlng2.lat - latlng1.lat) * rad / 2);
            const sinDLon = Math.sin((latlng2.lng - latlng1.lng) * rad / 2);
            const a = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return R * c;
        }

        /**
         * Update aircraft list. Add new if not existing.
         * @param data JSON data fetched from readsb backend.
         */
        private static Update(data: IAircraftsUpdate, nowTimestamp: number) {
            this.nowTimestamp = nowTimestamp;
            this.collectionStatistic.TrackedAircrafts = 0;
            this.collectionStatistic.TrackedAircraftUnknown = 0;
            this.collectionStatistic.TrackedAircraftPositions = 0;
            this.collectionStatistic.TrackedHistorySize = 0;
            for (const ac of data.aircraft) {
                const hex = ac.addr.toString(16);
                let entry = null;

                if (hex === "000000") {
                    continue;
                } // Skip invalid ICAO24

                // Do we already have this aircraft object in queue?
                // If not create one.
                if (this.aircraftIcaoList.includes(hex)) {
                    entry = this.aircraftCollection.get(hex);
                } else {
                    entry = new Aircraft(hex);
                    this.aircraftCollection.set(hex, entry);
                    this.aircraftIcaoList.push(hex);
                }

                // Update all aircraft object data.
                entry.UpdateData(nowTimestamp, ac);

                // If available, add position to trace via trace collector.
                if (entry.Position && entry.AltBaro) {
                    // Add position to trace and history
                    const pos = new Array(entry.Position.lat, entry.Position.lng, entry.AltBaro);
                    const msg = { type: "Update", data: [entry.Icao, pos, nowTimestamp] };
                    this.aircraftTraceCollector.postMessage(msg);
                    entry.HistorySize++;
                    // Get distance to site.
                    if (this.sitePosition !== null) {
                        entry.SiteDist = this.GetDistance(this.sitePosition, entry.Position);
                    }
                }

                // Create statistic info...
                this.collectionStatistic.TrackedHistorySize += entry.HistorySize;
                if (entry.CivilMil === null) {
                    this.collectionStatistic.TrackedAircraftUnknown++;
                }

                if (entry.Position !== null && entry.SeenPos < 60) {
                    this.collectionStatistic.TrackedAircraftPositions++;
                }
            }
            // Resort collection.
            this.ResortCollection();
            // Update aircraft information in UI...
            for (const [icao, ac] of this.aircraftCollection.entries()) {
                if (ac.UpdateVisibility(nowTimestamp)) {
                    // Count only visible aicrafts in.
                    this.collectionStatistic.TrackedAircrafts += 1;
                }
                this.worker.postMessage({ type: "Aircraft", data: [ac.SortPos, ac] });
            }
            // ...kick sorting the UI aircraft list...
            this.worker.postMessage({ type: "Sort", data: this.aircraftIcaoList });
            // And finally forward statistics to frontend.
            this.collectionStatistic.MessageRate = this.GetMessageRate();
            this.worker.postMessage({ type: "Statistic", data: this.collectionStatistic });
        }

        /**
         * Sorting functions.
         */
        private static CompareAlpha(xa: any, ya: any) {
            if (xa === ya) {
                return 0;
            }
            if (xa < ya) {
                return -1;
            }
            return 1;
        }

        private static CompareNumeric(xf: number, yf: number) {
            if (Math.abs(xf - yf) < 1e-9) {
                return 0;
            }

            return xf - yf;
        }

        private static SortBy(sortby: eSortBy) {
            if (sortby === this.sortCriteria) {
                this.sortAscending = !this.sortAscending;
                // This correctly flips the order of rows that compare equal.
                this.aircraftIcaoList.reverse();
            } else {
                this.sortAscending = true;
            }
            this.sortCriteria = sortby;
            switch (sortby) {
                case eSortBy.Icao:
                    this.sortCompare = this.CompareAlpha;
                    this.sortExtract = (x: IAircraft) => {
                        return x.Icao;
                    };
                    break;
                case eSortBy.Flight:
                    this.sortCompare = this.CompareAlpha;
                    this.sortExtract = (x: IAircraft) => {
                        return x.Flight;
                    };
                    break;
                case eSortBy.Registration:
                    this.sortCompare = this.CompareAlpha;
                    this.sortExtract = (x: IAircraft) => {
                        return x.Registration;
                    };
                    break;
                case eSortBy.Type:
                    this.sortCompare = this.CompareAlpha;
                    this.sortExtract = (x: IAircraft) => {
                        return x.IcaoType;
                    };
                    break;
                case eSortBy.Squawk:
                    this.sortCompare = this.CompareAlpha;
                    this.sortExtract = (x: IAircraft) => {
                        return x.Squawk;
                    };
                    break;
                case eSortBy.Altitude:
                    this.sortCompare = this.CompareNumeric;
                    this.sortExtract = (x: IAircraft) => {
                        return (isNaN(x.Altitude) ? -1e9 : x.Altitude);
                    };
                    break;
                case eSortBy.Speed:
                    this.sortCompare = this.CompareNumeric;
                    this.sortExtract = (x: IAircraft) => {
                        return x.Speed;
                    };
                    break;
                case eSortBy.VerticalRate:
                    this.sortCompare = this.CompareNumeric;
                    this.sortExtract = (x: IAircraft) => {
                        return x.VertRate;
                    };
                    break;
                case eSortBy.Distance:
                    this.sortCompare = this.CompareNumeric;
                    this.sortExtract = (x: IAircraft) => {
                        return x.SiteDist;
                    };
                    break;
                case eSortBy.Track:
                    this.sortCompare = this.CompareNumeric;
                    this.sortExtract = (x: IAircraft) => {
                        return x.Track;
                    };
                    break;
                case eSortBy.Messages:
                    this.sortCompare = this.CompareNumeric;
                    this.sortExtract = (x: IAircraft) => {
                        return x.Messages;
                    };
                    break;
                case eSortBy.Seen:
                    this.sortCompare = this.CompareNumeric;
                    this.sortExtract = (x: IAircraft) => {
                        return x.Seen;
                    };
                    break;
                case eSortBy.Country:
                    this.sortCompare = this.CompareAlpha;
                    this.sortExtract = (x: IAircraft) => {
                        return x.IcaoRange.Country;
                    };
                    break;
                case eSortBy.Rssi:
                    this.sortCompare = this.CompareNumeric;
                    this.sortExtract = (x: IAircraft) => {
                        return x.Rssi;
                    };
                    break;
                case eSortBy.Latitude:
                    this.sortCompare = this.CompareNumeric;
                    this.sortExtract = (x: IAircraft) => {
                        return (x.Position !== null ? x.Position.lat : null);
                    };
                    break;
                case eSortBy.Longitude:
                    this.sortCompare = this.CompareNumeric;
                    this.sortExtract = (x: IAircraft) => {
                        return (x.Position !== null ? x.Position.lng : null);
                    };
                    break;
                case eSortBy.CivilMil:
                    this.sortCompare = this.CompareAlpha;
                    this.sortExtract = (x: IAircraft) => {
                        return x.CivilMil;
                    };
                    break;
            }
            this.ResortCollection();
        }

        private static SortFunction(xs: string, ys: string) {
            const x = this.aircraftCollection.get(xs);
            const y = this.aircraftCollection.get(ys);
            const xv = x.SortValue;
            const yv = y.SortValue;

            // Put aircrafts marked interesting always on top of the list
            if (x.Interesting === true) {
                return -1;
            }
            if (y.Interesting === true) {
                return 1;
            }

            // Put aircrafts with special squawks on to of the list
            if (this.specialSquawks.includes(x.Squawk)) {
                return -1;
            }
            if (this.specialSquawks.includes(y.Squawk)) {
                return 1;
            }

            // always sort missing values at the end, regardless of
            // ascending/descending sort
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

        private static ResortCollection() {
            // Number the existing rows so we can do a stable sort
            // regardless of whether sort() is stable or not.
            // Also extract the sort comparison value.
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

    // Init backend database access and finally start this worker.
    DatabaseBackend.Init();
}
