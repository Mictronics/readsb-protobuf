"use strict";
var READSB;
(function (READSB) {
    class DatabaseBackend {
        static Init() {
            let request;
            try {
                request = indexedDB.open(this.databaseName);
            }
            catch (e) {
                throw new Error(`Frontend: Failed to open database: ${e.message}`);
            }
            request.onsuccess = (e) => {
                this.db = request.result;
                READSB.AircraftCollection.Init();
            };
            request.onerror = (e) => {
                console.error(`${e.target.error.name}: ${e.target.error.message}`);
                READSB.AircraftCollection.Init();
            };
        }
        static GetOperator(flight, requestCallback) {
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
        static GetType(type, requestCallback) {
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
        static GetAircraftData(icao, requestCallback) {
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
        static OnError(e) {
            console.error(`Backend: ${e.target.error.name}: ${e.target.error.message}`);
        }
    }
    DatabaseBackend.databaseName = "Readsb";
    READSB.DatabaseBackend = DatabaseBackend;
})(READSB || (READSB = {}));
//# sourceMappingURL=database.js.map