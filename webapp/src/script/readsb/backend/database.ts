// Part of readsb, a Mode-S/ADSB/TIS message decoder.
//
// database.ts: Functions to access browsers indexed database holding aircraft metadata.
//              Reduced version for backend worker.
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

namespace READSB {
    export class DatabaseBackend {
        /**
         * Initialize indexed database.
         */
        public static Init() {
            let request: IDBOpenDBRequest;

            try {
                request = indexedDB.open(this.databaseName);
                /* Causes an error when trying to open with lower version than existing */
            } catch (e) {
                throw new Error(`Frontend: Failed to open database: ${e.message}`);
            }

            request.onsuccess = (e) => {
                this.db = request.result;
                AircraftCollection.Init();
            };

            request.onerror = (e: any) => {
                console.error(`${e.target.error.name}: ${e.target.error.message}`);
                AircraftCollection.Init();
            };
        }

        /**
         * Get operator details from given flight id.
         * @param flight Flight id of aircraft.
         * @param requestCallback Callback function to store operator on aircraft.
         */
        public static GetOperator(flight: string, requestCallback: (result: any) => void) {
            if ((flight === null) || (isNaN(Number.parseInt(flight.substr(3, 1), 10)) === true)) {
                return;
            }
            const trans = this.db.transaction(["Operators"], "readonly");
            const store = trans.objectStore("Operators");
            const index = store.index("id");
            const req = index.get(flight.substring(0, 3));

            req.onsuccess = () => {
                requestCallback(req.result);
            };
            req.onerror = this.OnError;
        }

        /**
         * Get type details from given ICAO type identifier.
         * @param type Aircraft ICAO type identifier.
         * @param requestCallback Callback function to store type data on aircraft.
         */
        public static GetType(type: string, requestCallback: (result: any) => void) {
            if (type === undefined || type === null || type.length === 0) {
                return;
            }
            const trans = this.db.transaction(["Types"], "readonly");
            const store = trans.objectStore("Types");
            const index = store.index("type");
            const req = index.get(type.toUpperCase());

            req.onsuccess = () => {
                requestCallback(req.result);
            };
            req.onerror = this.OnError;
        }

        /* Get aircraft meta data from database */
        public static GetAircraftData(icao: string, requestCallback: (result: any) => void) {
            if (icao === undefined || icao === null || icao.length === 0) {
                return;
            }

            const trans = this.db.transaction(["Aircrafts"], "readonly");
            const store = trans.objectStore("Aircrafts");
            const index = store.index("icao24");
            const req = index.get(icao.toUpperCase());

            req.onsuccess = () => {
                requestCallback(req.result);
            };
            req.onerror = this.OnError;
        }

        private static databaseName: string = "Readsb";
        private static db: IDBDatabase;

        /**
         * Log any error of database operation.
         * @param e
         */
        private static OnError(e: any) {
            console.error(`Backend: ${e.target.error.name}: ${e.target.error.message}`);
        }
    }
}
