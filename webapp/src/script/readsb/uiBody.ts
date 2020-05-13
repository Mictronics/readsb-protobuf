// Part of readsb, a Mode-S/ADSB/TIS message decoder.
//
// uiBody.ts: Functions to manipulate the body of index.html
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
    export class Body {
        public static Init() {
            // Clone aircraft list row template from DOM
            this.rowTemplate = (document.getElementById("aircraftListRowTemplate") as HTMLTableRowElement);

            Input.Init();
            Filter.Init();
            this.SetLanguage(AppSettings.AppLanguage);

            // Maybe hide flag info
            this.ShowFlags(AppSettings.ShowFlags);

            // Hide some aircraft list columns when table is not expanded.
            this.AircraftListSetColumnVisibility(false);

            // Sort aircraft list first time depending on site status.
            if (typeof AppSettings.SiteLat === "number" && typeof AppSettings.SiteLon === "number") {
                Input.SetSiteCoordinates();
            } else {
                this.AircraftListShowColumn("#aircraftListDistance", false); // hide distance header
            }

            // Start backend worker that is collecting and managing all aircraft data.
            this.aircraftCollectionWorker = new Worker("./script/readsb/backend/aircraftCollection.js", { name: "AircraftCollectionWorker" });
            this.aircraftCollectionWorker.addEventListener("message", this.OnAircraftCollectionWorkerMessage.bind(this));

            // Initialize error toast
            $(".toast").toast({ autohide: false, animation: false });
            $(".toast").toast("hide");

            // Assign confirmation modal to ICAO24 edit field in edit aircraft dialog.
            document.getElementById("editIcao24").addEventListener("click", () => {
                $("#EditConfirmModal").modal("show");
            });

            // Open edit aircaft dialog with button in selected infoblock
            document.getElementById("editAircraftButton").addEventListener("click", () => {
                // Edit dialog is prefilled in function RefreshSelectedAircraft
                $("#EditAircraftModal").modal("show");
                document.getElementById("editRegistration").focus();
            });

            // Save changes on button click in edit aircraft dialog.
            document.getElementById("editAircraftSaveButton").addEventListener("click", () => {
                this.EditAircraftData();
            });

            // Replace default page name from settings.
            document.title = AppSettings.PageName;
            document.getElementById("infoblockName").innerText = AppSettings.PageName;
            (document.getElementById("inputPageName") as HTMLInputElement).value = AppSettings.PageName;

            if (AppSettings.ShowAltitudeChart) {
                document.getElementById("altitudeChart").classList.remove("hidden");
            } else {
                document.getElementById("altitudeChart").classList.add("hidden");
            }

            if (AppSettings.UseDarkTheme) {
                document.documentElement.setAttribute("data-theme", "dark");
            } else {
                document.documentElement.setAttribute("data-theme", "light");
            }

            // Make selected aircraft infoblock draggable.
            const selectInfoBlockDrag = new Draggable(document.getElementById("selectedInfoblock"));

            // Assign sort functions to aircraft list column header.
            document.getElementById("aircraftListIcao").addEventListener("click", this.AircraftListSortBy.bind(this, eSortBy.Icao));
            document.getElementById("aircraftListFlag").addEventListener("click", this.AircraftListSortBy.bind(this, eSortBy.Country));
            document.getElementById("aircraftListFlight").addEventListener("click", this.AircraftListSortBy.bind(this, eSortBy.Flight));
            document.getElementById("aircraftListRegistration").addEventListener("click", this.AircraftListSortBy.bind(this, eSortBy.Registration));
            document.getElementById("aircraftListCivilMil").addEventListener("click", this.AircraftListSortBy.bind(this, eSortBy.CivilMil));
            document.getElementById("aircraftListType").addEventListener("click", this.AircraftListSortBy.bind(this, eSortBy.Type));
            document.getElementById("aircraftListSquawk").addEventListener("click", this.AircraftListSortBy.bind(this, eSortBy.Squawk));
            document.getElementById("aircraftListAltitude").addEventListener("click", this.AircraftListSortBy.bind(this, eSortBy.Altitude));
            document.getElementById("aircraftListSpeed").addEventListener("click", this.AircraftListSortBy.bind(this, eSortBy.Speed));
            document.getElementById("aircraftListVerticalRate").addEventListener("click", this.AircraftListSortBy.bind(this, eSortBy.VerticalRate));
            document.getElementById("aircraftListDistance").addEventListener("click", this.AircraftListSortBy.bind(this, eSortBy.Distance));
            document.getElementById("aircraftListTrack").addEventListener("click", this.AircraftListSortBy.bind(this, eSortBy.Track));
            document.getElementById("aircraftListMessages").addEventListener("click", this.AircraftListSortBy.bind(this, eSortBy.Messages));
            document.getElementById("aircraftListSeen").addEventListener("click", this.AircraftListSortBy.bind(this, eSortBy.Seen));
            document.getElementById("aircraftListRssi").addEventListener("click", this.AircraftListSortBy.bind(this, eSortBy.Rssi));
            document.getElementById("aircraftListLat").addEventListener("click", this.AircraftListSortBy.bind(this, eSortBy.Latitude));
            document.getElementById("aircraftListLon").addEventListener("click", this.AircraftListSortBy.bind(this, eSortBy.Longitude));
            document.getElementById("exportDatabaseButton").addEventListener("click", DatabaseFrontend.ExportDB.bind(DatabaseFrontend));
            document.getElementById("importDatabaseButton").addEventListener("change", DatabaseFrontend.ImportDB.bind(DatabaseFrontend));

            /* Clicking the "lock" icon in selected aircraft info dialog will toggle following this aicraft. */
            document.getElementById("toggle-follow-icon").addEventListener("click", () => {
                this.followSelected = !this.followSelected;
                if (this.followSelected) {
                    if (LMap.ZoomLevel < 8) {
                        LMap.ZoomLevel = 8;
                    }
                    document.getElementById("toggle-follow-icon").classList.replace("follow-unlock-icon", "follow-lock-icon");
                } else {
                    document.getElementById("toggle-follow-icon").classList.replace("follow-lock-icon", "follow-unlock-icon");
                }
            });

            /* Clicking the "filter" icon in selected aircraft info dialog will set a filter for this aicraft. */
            document.getElementById("filter-selected-icon").addEventListener("click", () => {
                if (this.selectedAircraft) {
                    Filter.AircraftByAddress(this.selectedAircraft);
                }
            });

            // Set actual unit in selector drop-down
            if (AppSettings.DisplayUnits === null) {
                AppSettings.DisplayUnits = "nautical";
            }
            const unitsSelector = document.getElementById("unitsSelector") as HTMLSelectElement;
            unitsSelector.value = AppSettings.DisplayUnits;
            unitsSelector.addEventListener("change", this.OnDisplayUnitsChanged.bind(this));
            if (AppSettings.DisplayUnits === "metric") {
                document.getElementById("altitudeChartButton").classList.add("altitudeMeters");
            } else {
                document.getElementById("altitudeChartButton").classList.remove("altitudeMeters");
            }

            const btns = document.getElementById("langDropdownItems").getElementsByTagName("button") as HTMLCollection;
            for (const btn of btns) {
                btn.addEventListener("click", this.OnLanguageChange.bind(this));
                if (btn.id === AppSettings.AppLanguage) {
                    btn.classList.add("active");
                }
            }
        }

        /**
         * Set column visibility in aircraft list.
         */
        public static AircraftListSetColumnVisibility(visible: boolean) {
            this.AircraftListShowColumn("aircraftListRegistration", visible);
            this.AircraftListShowColumn("aircraftListType", visible);
            this.AircraftListShowColumn("aircraftListVerticalRate", visible);
            this.AircraftListShowColumn("aircraftListRssi", visible);
            this.AircraftListShowColumn("aircraftListLat", visible);
            this.AircraftListShowColumn("aircraftListLon", visible);
            this.AircraftListShowColumn("aircraftListMessages", visible);
            this.AircraftListShowColumn("aircraftListSeen", visible);
            this.AircraftListShowColumn("aircraftListTrack", visible);
            this.AircraftListShowColumn("aircraftListFlag", AppSettings.ShowFlags);
        }

        public static GetAircraftListRowTemplate(): HTMLTableRowElement {
            return (document.getElementById("aircraftListRowTemplate") as HTMLTableRowElement);
        }

        /**
         * Change units in aircraft list when global units change.
         */
        public static UpdateAircraftListColumnUnits() {
            document.getElementById("aircraftListAltitudeUnit").textContent = Strings.AltitudeUnit;
            document.getElementById("aircraftListSpeedUnit").textContent = Strings.SpeedUnit;
            document.getElementById("aircraftListDistanceUnit").textContent = Strings.DistanceUnit;
            document.getElementById("aircraftListVerticalRateUnit").textContent = Strings.VerticalRateUnit;
        }

        /**
         * Show or hide error message toast.
         * @param text Error message.
         * @param show Show toast if true.
         */
        public static UpdateErrorToast(text: string, show: boolean) {
            if (this.errorToastStatus === show) {
                // Avoid jQuery call on each update cycle.
                return;
            }
            document.getElementsByClassName("toast-body").item(0).textContent = text;
            if (show) {
                $(".toast").toast("show");
            } else {
                $(".toast").toast("hide");
            }
            this.errorToastStatus = show;
        }

        /**
         * Show or hide flags in aircraft list depending on user settings.
         * @param show Show flags if true.
         */
        public static ShowFlags(show: boolean) {
            if (show) {
                this.rowTemplate.cells[1].classList.remove("hidden"); // Show flag column
                this.rowTemplate.cells[1].hidden = false;
                document.getElementById("aircraftListFlag").classList.remove("hidden"); // Show flag header
                document.getElementById("infoblockCountry").classList.remove("hidden"); // Show country row
            } else {
                this.rowTemplate.cells[1].classList.add("hidden"); // Hide flag column
                this.rowTemplate.cells[1].hidden = true;
                document.getElementById("aircraftListFlag").classList.add("hidden"); // Hide flag header
                document.getElementById("infoblockCountry").classList.add("hidden"); // Hide country row
            }
        }

        /**
         * Forward selection of all aircrafts to backend worker.
         * @param all True when all all aircrafts are selected
         */
        public static SelectAll(all: boolean) {
            if (all) {
                this.selectedAircraft = "*";
                this.GetAircraft("*"); // Refresh immediately
            } else {
                LMap.AircraftTraces.clearLayers();
                this.aircraftTraces.clear();
                this.selectedAircraft = null;
            }
            this.RefreshSelectedAircraft(null);
        }

        /**
         * Select or deselect a specific aircraft.
         * @param icao Aircraft address to select.
         * @param autofollow True if map center shall follow aircraft position.
         */
        public static SelectAircraftByIcao(icao: string, autofollow: boolean) {
            // If we are clicking the same plane, we are deselecting it.
            // (unless it was a doubleclick..)
            if (this.selectedAircraft === icao && !autofollow) {
                icao = null;
            }

            // Deselect all other aircrafts if any.
            this.SelectAll(false);

            if (this.selectedAircraft !== null) {
                this.ClearTrace(this.selectedAircraft);
                this.RefreshSelectedAircraft(null);
            }

            if (icao !== null) {
                this.selectedAircraft = icao;
                this.GetAircraft(icao);
            } else {
                this.selectedAircraft = null;
                this.RefreshSelectedAircraft(null);
            }

            if (this.selectedAircraft !== null && autofollow) {
                this.followSelected = true;
            } else {
                this.followSelected = false;
            }
        }

        /**
         * Request specific aircraft data from backend. This will automatically update the
         * aircraft list row or the selected info block in case aircraft is selected.
         * Wildcard "*" will request refreshing of all aircrafts.
         * @param icao Aircraft address to get
         */
        public static GetAircraft(icao: string) {
            this.aircraftCollectionWorker.postMessage({ type: "Aircraft", data: icao });
        }

        /**
         * Forward new site position to backend worker.
         */
        public static SetSitePosition() {
            this.aircraftCollectionWorker.postMessage({ type: "SitePosition", data: [AppSettings.SiteLat, AppSettings.SiteLon] });
        }

        private static errorToastStatus: boolean = false;
        private static rowTemplate: HTMLTableRowElement = null;
        private static followSelected: boolean = false;
        private static selectedAircraft: string = null;
        private static aircraftMarkers = new Map<string, L.AircraftMarker>();
        private static aircraftTraces = new Map<string, L.FeatureGroup>();

        /**
         * Special allocated squawks by ICAO, rest mainly in Germany.
         */
        private static specialSquawks: { [key: string]: ISpecialSquawk } = {
            "0020": { CssClass: "squawkSpecialDE", MarkerColor: "rgb(227, 200, 0)", Text: "Rettungshubschrauber" },
            "0023": { CssClass: "squawkSpecialDE", MarkerColor: "rgb(0, 80, 239)", Text: "Bundespolizei" },
            "0025": { CssClass: "squawkSpecialDE", MarkerColor: "rgb(243, 156, 18)", Text: "Absetzluftfahrzeug" },
            "0027": { CssClass: "squawkSpecialDE", MarkerColor: "rgb(243, 156, 18)", Text: "Kunstflug" },
            "0030": { CssClass: "squawkSpecialDE", MarkerColor: "rgb(243, 156, 18)", Text: "Vermessung" },
            "0031": { CssClass: "squawkSpecialDE", MarkerColor: "rgb(243, 156, 18)", Text: "Open Skies" },
            "0033": { CssClass: "squawkSpecialDE", MarkerColor: "rgb(0, 138, 0)", Text: "VFR Militär 550ftAGL <FL100" },
            "0034": { CssClass: "squawkSpecialDE", MarkerColor: "rgb(243, 156, 18)", Text: "SAR Einsatz" },
            "0036": { CssClass: "squawkSpecialDE", MarkerColor: "rgb(0, 80, 239)", Text: "Polizei Einsatz" },
            "0037": { CssClass: "squawkSpecialDE", MarkerColor: "rgb(0, 80, 239)", Text: "Polizei BIV" },
            "1600": { CssClass: "squawkSpecialDE", MarkerColor: "rgb(0, 138, 0)", Text: "Militär Tieflug <500ft" },
            "7500": { CssClass: "squawk7500", MarkerColor: "rgb(255, 85, 85)", Text: "Aircraft Hijacking" },
            "7600": { CssClass: "squawk7600", MarkerColor: "rgb(0, 255, 255)", Text: "Radio Failure" },
            "7700": { CssClass: "squawk7700", MarkerColor: "rgb(255, 255, 0)", Text: "General Emergency" },
        };

        // Backend worker managing the aircraft collection.
        private static aircraftCollectionWorker: Worker;
        private static aircraftTraceCollector: MessagePort = null;

        /**
         * Callback for messages from aircraftCollectionWorker.
         * Backend -> frontend.
         * @param ev Message event data.
         */
        private static OnAircraftCollectionWorkerMessage(ev: MessageEvent) {
            const msg = ev.data;
            switch (msg.type) {
                case "Port":
                    this.aircraftTraceCollector = msg.data;
                    this.aircraftTraceCollector.onmessage = (evt: MessageEvent) => {
                        const msg2 = evt.data;
                        if (msg2.type === "Trace") {
                            this.UpdateTrace(msg2.data[0], msg2.data[1]);
                        }
                    };
                    break;
                case "ReceiverPosition":
                    AppSettings.SiteLat = msg.data[0];
                    AppSettings.SiteLon = msg.data[1];
                    Input.SetSiteCoordinates();
                    // Update GPS status in UI.
                    // tslint:disable-next-line: no-bitwise
                    if ((msg.data[2] & 0x8000) === 0x8000) {
                        document.getElementById("infoblockGpsStatus").classList.remove("no-gps-icon");
                        document.getElementById("infoblockGpsStatus").classList.remove("gps-position-icon");
                        document.getElementById("infoblockGpsStatus").classList.add("gps-no-position-icon");
                    } else {
                        document.getElementById("infoblockGpsStatus").classList.remove("gps-no-position-icon");
                        document.getElementById("infoblockGpsStatus").classList.remove("gps-position-icon");
                        document.getElementById("infoblockGpsStatus").classList.add("no-gps-icon");
                        document.getElementById("infoblockGpsStatus").innerHTML = "";
                    }
                    // tslint:disable-next-line: no-bitwise
                    if ((msg.data[2] & 0xE000) === 0xE000) {
                        // Show GPS position icon, satellite numbers and HDOP.
                        document.getElementById("infoblockGpsStatus").classList.replace("gps-no-position-icon", "gps-position-icon");
                        document.getElementById("infoblockGpsStatus").innerHTML = `&nbsp;${msg.data[3]}/${msg.data[4] / 10}`;
                        // tslint:disable-next-line: no-bitwise
                    } else if ((msg.data[2] & 0xC000) === 0xC000) {
                        document.getElementById("infoblockGpsStatus").classList.replace("gps-position-icon", "gps-no-position-icon");
                    }
                    break;
                case "Error":
                    if (msg.data === false) {
                        this.UpdateErrorToast("", false);
                    } else {
                        this.UpdateErrorToast(i18next.t(msg.data, { msg: msg.error }), true);
                    }
                    break;
                case "Statistic":
                    this.RefreshInfoBlock(msg.data);
                    break;
                case "Aircraft":
                    this.RefreshAircraftInformation(msg.data[0], msg.data[1]);
                    break;
                case "Sort":
                    const tbody = (document.getElementById("aircraftList") as HTMLTableElement).tBodies[0];
                    for (const [pos, icao] of msg.data.entries()) {
                        const r = document.getElementById(icao) as HTMLTableRowElement;
                        if (r !== null && pos !== r.sectionRowIndex) {
                            tbody.insertBefore(r, tbody.rows[pos]);
                        }
                    }
                    break;
                case "Range":
                    LMap.CreateSiteCircles(msg.data);
                    break;
                default:
                    break;
            }
        }

        /**
         * Set application language.
         * @param lng Language to set (ISO-639-1 code)
         */
        private static SetLanguage(lng: string) {
            // Make english the default language in failure cases
            if (lng === "" || lng === null || lng === undefined) {
                lng = "en";
            }

            i18next.use(i18nextXHRBackend).init({
                backend: {
                    loadPath: `./locales/${lng}.json`,
                },
                debug: false,
                fallbackLng: "en",
                lng,
            }, (err, t) => {
                const localize = LocI18next.Init(i18next);
                localize(".localized");
                Strings.OnLanguageChange();
                Body.UpdateAircraftListColumnUnits();
                // Init map when i18next is initialized to translate its strings.
                // No initialization when language changes.
                // Same rules when restoring session filters.
                if (!LMap.Initialized) {
                    LMap.Init();
                    Filter.RestoreSessionFilters();
                }
            });
        }

        /**
         * Eventhandler when row in aircraft is clicked.
         * @param h
         * @param evt
         */
        private static OnAircraftListRowClick(h: any, evt: any) {
            if (evt.srcElement instanceof HTMLAnchorElement) {
                evt.stopPropagation();
                return;
            }
            this.SelectAircraftByIcao(h, false);
            evt.preventDefault();
        }

        /**
         * Eventhandler when row in aircraft is double clicked.
         * @param h
         * @param evt
         */
        private static OnAircraftListRowDoubleClick(h: any, evt: any) {
            this.SelectAircraftByIcao(h, true);
            evt.preventDefault();
        }

        /**
         * Refresh specific aircraft information, either in aircraft list or selected info block
         * in case aircraft is selected.
         * @param pos Position withtin the list of sorted aircrafts.
         * @param ac Aircraft data from backend.
         */
        private static RefreshAircraftInformation(pos: number, ac: IAircraft) {
            if (!LMap.Initialized) {
                return;
            }
            // Check for filtering of this aircraft.
            let isFiltered = false;
            let isHighlight = false;
            if (AppSettings.EnableFilter) {
                for (const f of AircraftFilterCollection) {
                    isFiltered = f.IsFiltered(ac);
                    if (isFiltered === true) {
                        break; // At least one filter matches, filter out this aircraft
                    }
                }
                // Check if we only highlight but not filter
                if (AppSettings.EnableHighlightFilter) {
                    isHighlight = true;
                    if (isFiltered === true) {
                        // Don't highlight aircrafts that not match filter
                        isHighlight = false;
                    }
                    isFiltered = false;
                }
            }

            const mapBounds = LMap.MapViewBounds;
            let hideOutOfBounds = false;
            if (mapBounds && ac.Position !== null) {
                hideOutOfBounds = !mapBounds.contains(ac.Position) && AppSettings.HideAircraftsNotInView;
            }

            // Update Marker and trace.
            if (!hideOutOfBounds && !isFiltered && ac.Position !== null && ac.SeenPos < 60) {
                this.UpdateAircraftMarker(ac);
                // Request aircraft flight path (trace) from backend when selected or
                // all selected and visible on map.
                if (this.selectedAircraft === ac.Icao || this.selectedAircraft === "*") {
                    this.aircraftTraceCollector.postMessage({ type: "Get", data: ac.Icao });
                }
            } else {
                this.ClearMarker(ac.Icao);
                this.ClearTrace(ac.Icao);
            }

            // Update info block in case aircraft is selected
            if (this.selectedAircraft === ac.Icao) {
                this.RefreshSelectedAircraft(ac);
            }

            // Update aircraft list
            const tbody = (document.getElementById("aircraftList") as HTMLTableElement).tBodies[0];
            let r = document.getElementById(ac.Icao) as HTMLTableRowElement;
            if (!ac.VisibleInList && r === null) {
                // Aircraft not visible and not in list - nothing to do.
                return;
            } else if ((isFiltered || !ac.VisibleInList || hideOutOfBounds) && r !== null) {
                // Aircraft filtered or not visible but in list - remove.
                // Remove all the rows children
                const range = document.createRange();
                range.selectNodeContents(r);
                range.deleteContents();
                // Remove event listeners
                r.removeEventListener("click", Body.OnAircraftListRowClick.bind(Body, ac.Icao));
                r.removeEventListener("dblclick", Body.OnAircraftListRowDoubleClick.bind(Body, ac.Icao));
                // Last remove row itself from DOM
                tbody.removeChild(r);
                return;
            } else if (ac.VisibleInList && r === null) {
                // Filtered or not in view, don't create a row
                if (isFiltered || hideOutOfBounds) { return; }
                // Aircraft visible but not in list and not filtered - create.
                r = this.rowTemplate.cloneNode(true) as HTMLTableRowElement;
                r.id = ac.Icao;

                if (ac.Icao[0] === "~") {
                    // Non-ICAO address
                    r.cells[0].textContent = ac.Icao.substring(1).toUpperCase();
                    r.style.fontStyle = "italic";
                } else {
                    r.cells[0].textContent = ac.Icao.toUpperCase();
                }

                // set flag image if available
                // Hidden property is set in ShowFlags together with hidden class.
                if (!r.cells[1].hidden && ac.IcaoRange.FlagImage !== null) {
                    r.cells[1].getElementsByTagName("img")[0].src = AppSettings.FlagPath + ac.IcaoRange.FlagImage;
                    r.cells[1].getElementsByTagName("img")[0].title = ac.IcaoRange.Country;
                }

                r.addEventListener("click", Body.OnAircraftListRowClick.bind(Body, ac.Icao));
                r.addEventListener("dblclick", Body.OnAircraftListRowDoubleClick.bind(Body, ac.Icao));
                // Finally add to list
                tbody.appendChild(r);
            }
            // Aircraft visible and we have a row - update.
            let classes = "aircraftListRow";

            if (ac.Position !== null && ac.SeenPos < 60) {
                if (ac.PositionFromMlat) {
                    classes += " mlat";
                } else {
                    classes += " vPosition";
                }
            }

            if (ac.Interesting === true || isHighlight === true) {
                classes += " interesting";
            }

            if (ac.Icao === this.selectedAircraft) {
                classes += " selected";
            }

            if (ac.Squawk in this.specialSquawks) {
                classes = classes + " " + this.specialSquawks[ac.Squawk].CssClass;
            }

            if (AppSettings.ShowFlags) {
                r.cells[1].className = "showFlags prio-2";
            } else {
                r.cells[1].className = "hideFlags";
            }

            if (ac.Flight) {
                r.cells[2].textContent = ac.Flight;
                if (ac.Operator !== null) {
                    r.cells[2].title = ac.Operator;
                }
            } else {
                r.cells[2].textContent = "";
            }

            let alt = Format.AltitudeBrief(ac.Altitude, ac.VertRate, AppSettings.DisplayUnits);
            if (ac.AirGround === eAirGround.ground) {
                alt = Strings.Ground;
            }

            // Update only visible cells.
            // Hidden property is set in AircraftListShowColumn together with hidden class.
            if (!r.cells[3].hidden) { r.cells[3].textContent = (ac.Registration !== null ? ac.Registration : ""); }
            if (!r.cells[4].hidden) { r.cells[4].textContent = (ac.CivilMil !== null ? (ac.CivilMil === true ? Strings.MilitaryShort : Strings.CivilShort) : ""); }
            if (!r.cells[5].hidden) { r.cells[5].textContent = (ac.IcaoType !== null ? ac.IcaoType : ""); }
            if (!r.cells[6].hidden) { r.cells[6].textContent = (ac.Squawk !== null ? ac.Squawk : ""); }
            if (!r.cells[7].hidden) { r.cells[7].textContent = alt; }
            if (!r.cells[8].hidden) { r.cells[8].textContent = Format.SpeedBrief(ac.Speed, AppSettings.DisplayUnits); }
            if (!r.cells[9].hidden) { r.cells[9].textContent = Format.VerticalRateBrief(ac.VertRate, AppSettings.DisplayUnits); }
            if (!r.cells[10].hidden) { r.cells[10].textContent = Format.DistanceBrief(ac.SiteDist, AppSettings.DisplayUnits); }
            if (!r.cells[11].hidden) { r.cells[11].textContent = Format.TrackBrief(ac.Track); }
            if (!r.cells[12].hidden) { r.cells[12].textContent = (ac.Messages !== null ? ac.Messages.toString() : ""); }
            if (!r.cells[13].hidden) { r.cells[13].textContent = ac.Seen.toFixed(0); }
            if (!r.cells[14].hidden) { r.cells[14].textContent = (ac.Rssi !== null ? ac.Rssi.toFixed(1) : ""); }
            if (!r.cells[15].hidden) { r.cells[15].textContent = (ac.Position !== null ? ac.Position.lat.toFixed(4) : ""); }
            if (!r.cells[16].hidden) { r.cells[16].textContent = (ac.Position !== null ? ac.Position.lng.toFixed(4) : ""); }
            r.className = classes;
        }

        /**
         * Refresh the detailed info block for selected aircraft.
         * @param ac Aircraft data.
         */
        private static RefreshSelectedAircraft(ac: IAircraft) {
            if (this.selectedAircraft !== null && this.selectedAircraft !== "*") {
                document.getElementById("selectedInfoblock").classList.remove("hidden");
            } else {
                document.getElementById("selectedInfoblock").classList.add("hidden");
            }

            if (ac === null) {
                return;
            }

            // Fill edit aircraft dialog even when hidden. Just in case we want to edit.
            (document.getElementById("editIcao24") as HTMLInputElement).value = ac.Icao.toUpperCase();

            if (ac.Registration !== null) {
                if (ac.Registration.startsWith("#")) {
                    (document.getElementById("editRegistration") as HTMLInputElement).value = ac.Registration.substr(2).toUpperCase();
                } else {
                    (document.getElementById("editRegistration") as HTMLInputElement).value = ac.Registration.toUpperCase();
                }
            }

            if (ac.IcaoType !== null) {
                (document.getElementById("editType") as HTMLInputElement).value = ac.IcaoType.toUpperCase();
            }
            if (ac.TypeDescription !== null) {
                (document.getElementById("editDescription") as HTMLInputElement).value = ac.TypeDescription;
            }

            if (ac.Interesting !== null && ac.Interesting) {
                (document.getElementById("editInterestingCheck") as HTMLInputElement).checked = true;
            } else {
                (document.getElementById("editInterestingCheck") as HTMLInputElement).checked = false;
            }

            if (ac.CivilMil !== null && ac.CivilMil) {
                (document.getElementById("editMilitaryCheck") as HTMLInputElement).checked = true;
            } else {
                (document.getElementById("editMilitaryCheck") as HTMLInputElement).checked = false;
            }

            // Update selected info block
            if (ac.Flight !== null && ac.Flight !== "") {
                document.getElementById("selectedFlightId").innerHTML = ac.ExternalInfoLink;
            } else {
                document.getElementById("selectedFlightId").innerText = Strings.NotApplicable;
            }

            if (ac.Operator !== null) {
                document.getElementById("selectedOperator").innerText = ac.Operator;
                document.getElementById("infoblockOperator").classList.remove("hidden");
            } else {
                document.getElementById("infoblockOperator").classList.add("hidden");
            }

            if (ac.Callsign !== null && ac.Callsign !== "") {
                document.getElementById("selectedCallsign").innerText = ac.Callsign;
                document.getElementById("infoblockCallsign").classList.remove("hidden");
            } else {
                document.getElementById("infoblockCallsign").classList.add("hidden");
            }

            if (ac.Registration !== null) {
                document.getElementById("selectedRegistration").innerText = ac.Registration;
            } else {
                document.getElementById("selectedRegistration").innerText = "";
            }

            if (ac.IcaoType !== null) {
                document.getElementById("selectedIcaoType").innerText = ac.IcaoType;
            } else {
                document.getElementById("selectedIcaoType").innerText = "";
            }

            if (ac.TypeDescription !== null) {
                document.getElementById("selectedDescription").innerText = ac.TypeDescription;
                document.getElementById("selectedIcaoType").innerText = "";
            } else {
                document.getElementById("selectedDescription").innerText = "";
            }

            const emerg = document.getElementById("selectedEmergency");
            if (ac.Squawk in this.specialSquawks) {
                emerg.className = this.specialSquawks[ac.Squawk].CssClass;
                emerg.textContent = "\u00a0" + "Squawking: " + this.specialSquawks[ac.Squawk].Text + "\u00a0";
            } else {
                emerg.className = "hidden";
            }

            if (ac.AirGround === eAirGround.ground) {
                document.getElementById("selectedAltitude").innerText = Strings.Ground;
            } else {
                document.getElementById("selectedAltitude").innerText = Format.AltitudeLong(ac.Altitude, ac.VertRate, AppSettings.DisplayUnits);
            }

            if (ac.Squawk === null || ac.Squawk === "0000") {
                document.getElementById("selectedSquawk").innerText = Strings.NotApplicable;
            } else {
                document.getElementById("selectedSquawk").innerText = ac.Squawk;
            }

            document.getElementById("selectedIcao").innerText = ac.Icao.toUpperCase();
            (document.getElementById("selectedIcao") as HTMLLinkElement).href = "https://www.planespotters.net/search?q=" + ac.Icao;

            document.getElementById("selectedSpeedGs").innerText = Format.SpeedLong(ac.Gs, AppSettings.DisplayUnits);
            document.getElementById("selectedVerticalRate").innerText = Format.VerticalRateLong(ac.VertRate, AppSettings.DisplayUnits);
            document.getElementById("selectedTrack").innerText = Format.TrackLong(ac.Track);

            if (ac.Seen <= 1) {
                document.getElementById("selectedSeen").innerText = Strings.Now;
            } else {
                document.getElementById("selectedSeen").innerText = ac.Seen + Strings.TimeUnit;
            }

            if (ac.CivilMil !== null) {
                if (ac.CivilMil === true) {
                    document.getElementById("selectedCivilMil").innerText = Strings.Military;
                } else {
                    document.getElementById("selectedCivilMil").innerText = Strings.Civil;
                }
            } else {
                document.getElementById("selectedCivilMil").innerText = "Country of";
            }

            if (ac.Interesting !== null && ac.Interesting === true) {
                document.getElementById("infoblockHead").classList.add("interesting");
            } else {
                document.getElementById("infoblockHead").classList.remove("interesting");
            }

            document.getElementById("selectedCountry").innerText = ac.IcaoRange.Country;
            if (AppSettings.ShowFlags && ac.IcaoRange.FlagImage !== null) {
                const sf = document.getElementById("selectedFlag");
                sf.classList.remove("hidden");
                ((sf.firstElementChild) as HTMLImageElement).src = AppSettings.FlagPath + ac.IcaoRange.FlagImage;
                ((sf.firstElementChild) as HTMLImageElement).title = ac.IcaoRange.Country;
            } else {
                document.getElementById("selectedFlag").classList.add("hidden");
            }

            if (ac.Position === null) {
                document.getElementById("selectedPosition").innerText = Strings.NotApplicable;
            } else {
                document.getElementById("selectedPosition").innerText = Format.LatLong(ac.Position);

                if (this.followSelected) {
                    LMap.Center = ac.Position;
                }
            }

            document.getElementById("selectedSource").innerText = Format.DataSource(ac.DataSource);

            document.getElementById("selectedSiteDist").innerText = Format.DistanceLong(ac.SiteDist, AppSettings.DisplayUnits);
            document.getElementById("selectedRssi").innerText = ac.Rssi.toFixed(1) + " dBFS";
            document.getElementById("selectedMessageCount").innerText = ac.Messages.toString();

            document.getElementById("selectedAltitudeGeom").innerText = Format.AltitudeLong(ac.AltGeom, ac.GeomRate, AppSettings.DisplayUnits);
            document.getElementById("selectedHeadingMag").innerText = Format.TrackLong(ac.MagHeading);
            document.getElementById("selectedHeadingTrue").innerText = Format.TrackLong(ac.TrueHeading);
            document.getElementById("selectedSpeedIas").innerText = Format.SpeedLong(ac.Ias, AppSettings.DisplayUnits);
            document.getElementById("selectedSpeedTas").innerText = Format.SpeedLong(ac.Tas, AppSettings.DisplayUnits);

            if (ac.Mach === null) {
                document.getElementById("selectedSpeedMach").innerText = Strings.NotApplicable;
            } else {
                document.getElementById("selectedSpeedMach").innerText = ac.Mach.toFixed(3);
            }

            /*
             * Not indicated in selected infoblock.
            if (selected.Roll === null) {
                document.getElementById("selectedRoll").innerText = Strings.NotApplicable;
            } else {
                document.getElementById("selectedRoll").innerText = selected.Roll.toFixed(1);
            }
            */
            if (ac.TrackRate === null) {
                document.getElementById("selectedTrackRate").innerText = Strings.NotApplicable;
            } else {
                document.getElementById("selectedTrackRate").innerText = ac.TrackRate.toFixed(2);
            }

            document.getElementById("selectedGeomRate").innerText = Format.VerticalRateLong(ac.GeomRate, AppSettings.DisplayUnits);

            if (ac.NavQnh === null) {
                document.getElementById("selectedNavQnh").innerText = Strings.NotApplicable;
            } else {
                document.getElementById("selectedNavQnh").innerText = ac.NavQnh.toFixed(1) + Strings.PressureUnit;
            }
            document.getElementById("selectedNavAltitude").innerText = Format.AltitudeLong(ac.NavAltitude, 0, AppSettings.DisplayUnits);
            document.getElementById("selectedNavHeading").innerText = Format.TrackLong(ac.NavHeading);
            if (ac.NavModes === null) {
                document.getElementById("selectedNavModes").innerText = Strings.NotApplicable;
            } else {
                document.getElementById("selectedNavModes").innerText = ac.NavModes.join();
            }
            if (ac.NicBaro === null) {
                document.getElementById("selectedNicBaro").innerText = Strings.NotApplicable;
            } else {
                if (ac.NicBaro === 1) {
                    document.getElementById("selectedNicBaro").innerText = Strings.CrossChecked;
                } else {
                    document.getElementById("selectedNicBaro").innerText = Strings.NotCrossChecked;
                }
            }

            document.getElementById("selectedNacp").innerText = Format.NacP(ac.NacP);
            document.getElementById("selectedNacv").innerText = Format.NacV(ac.NacV);
            if (ac.Rc === null) {
                document.getElementById("selectedRc").innerText = Strings.NotApplicable;
            } else if (ac.Rc === 0) {
                document.getElementById("selectedRc").innerText = Strings.Unknown;
            } else {
                document.getElementById("selectedRc").innerText = Format.DistanceShort(ac.Rc, AppSettings.DisplayUnits);
            }

            if (ac.Sil === null || ac.SilType === null) {
                document.getElementById("selectedSil").innerText = Strings.NotApplicable;
            } else {
                let sampleRate = "";
                let silDesc = "";
                if (ac.SilType === "perhour") {
                    sampleRate = Strings.PerHour;
                } else if (ac.SilType === "persample") {
                    sampleRate = Strings.PerSample;
                }

                switch (ac.Sil) {
                    case 0:
                        silDesc = "&gt; 1×10<sup>-3</sup>";
                        break;
                    case 1:
                        silDesc = "≤ 1×10<sup>-3</sup>";
                        break;
                    case 2:
                        silDesc = "≤ 1×10<sup>-5</sup>";
                        break;
                    case 3:
                        silDesc = "≤ 1×10<sup>-7</sup>";
                        break;
                    default:
                        silDesc = Strings.NotApplicable;
                        sampleRate = "";
                        break;
                }
                document.getElementById("selectedSil").innerHTML = silDesc + sampleRate;
            }

            if (ac.Version === null) {
                document.getElementById("selectedAdsbVersion").innerText = Strings.None;
            } else if (ac.Version === 0) {
                document.getElementById("selectedAdsbVersion").innerText = "v0 (DO-260)";
            } else if (ac.Version === 1) {
                document.getElementById("selectedAdsbVersion").innerText = "v1 (DO-260A)";
            } else if (ac.Version === 2) {
                document.getElementById("selectedAdsbVersion").innerText = "v2 (DO-260B)";
            } else {
                document.getElementById("selectedAdsbVersion").innerText = "v" + ac.Version;
            }

            if (ac.Declination !== null) {
                document.getElementById("selectedDeclination").innerText = `${ac.Declination.toFixed(1)}°`;
            }
            // Wind speed and direction
            if (ac.WindDirection !== null && ac.WindSpeed !== null) {
                document.getElementById("selectedWindSpeed").innerText = Format.SpeedLong(ac.WindSpeed, AppSettings.DisplayUnits);
                document.getElementById("selectedWindDirection").innerText = Format.TrackLong(ac.WindDirection);

                document.getElementById("windArrow").classList.remove("hidden");
                const C = Math.PI / 180;
                const arrowx1 = 20 - 12 * Math.sin(C * ac.WindDirection);
                const arrowx2 = 20 + 12 * Math.sin(C * ac.WindDirection);
                const arrowy1 = 20 + 12 * Math.cos(C * ac.WindDirection);
                const arrowy2 = 20 - 12 * Math.cos(C * ac.WindDirection);
                document.getElementById("windArrow").setAttribute("x1", arrowx1.toString());
                document.getElementById("windArrow").setAttribute("x2", arrowx2.toString());
                document.getElementById("windArrow").setAttribute("y1", arrowy1.toString());
                document.getElementById("windArrow").setAttribute("y2", arrowy2.toString());
            } else {
                document.getElementById("windArrow").classList.add("hidden");
                document.getElementById("selectedWindSpeed").innerText = Strings.NotApplicable;
                document.getElementById("selectedWindDirection").innerText = Strings.NotApplicable;
            }
        }

        /**
         * Update page title.
         * @param trackedAircraft Number of tracked aircrafts.
         * @param trackedPositions Number of tracked aircrafts with position.
         * @param messageRate Actual rate of incoming aircraft messages.
         */
        private static RefreshPageTitle(trackedAircraft: number, trackedPositions: number, messageRate: number) {
            if (!AppSettings.ShowAircraftCountInTitle && !AppSettings.ShowMessageRateInTitle) {
                document.title = AppSettings.PageName;
                return;
            }

            let subtitle = "";

            if (AppSettings.ShowAircraftCountInTitle) {
                subtitle += `${trackedAircraft}/${trackedPositions}`;
            }

            if (AppSettings.ShowMessageRateInTitle && messageRate !== null) {
                if (subtitle) {
                    subtitle += " | ";
                }
                subtitle += ` - ${(messageRate / 1E03).toFixed(1)}k/s`;
            }

            document.title = `${AppSettings.PageName} - ${subtitle}`;
        }

        /**
         * Update info card (first one above aircraft list) and page title.
         * @param stats Aircraft collection statistics
         */
        private static RefreshInfoBlock(stats: ICollectionStatistics) {
            document.getElementById("infoblockVersion").innerText = stats.Version;
            document.getElementById("infoblockTotalAircraft").innerText = stats.TrackedAircrafts + "/" + stats.TrackedAircraftUnknown;
            document.getElementById("infoblockTotalAircraftPositions").innerText = stats.TrackedAircraftPositions.toString();

            if (stats.TrackedHistorySize >= 1E06) {
                document.getElementById("infoblockTotalHistory").innerText = (stats.TrackedHistorySize / 1E06).toFixed(1) + "M";
            } else if (stats.TrackedHistorySize >= 1E03) {
                document.getElementById("infoblockTotalHistory").innerText = (stats.TrackedHistorySize / 1E03).toFixed(2) + "k";
            } else {
                document.getElementById("infoblockTotalHistory").innerText = stats.TrackedHistorySize.toString();
            }

            if (stats.MessageRate !== null) {
                if (stats.MessageRate >= 1E06) {
                    document.getElementById("infoblockMessageRate").innerText = (stats.MessageRate / 1E06).toFixed(1) + "M";
                } else if (stats.MessageRate >= 1E03) {
                    document.getElementById("infoblockMessageRate").innerText = (stats.MessageRate / 1E03).toFixed(1) + "k";
                } else {
                    document.getElementById("infoblockMessageRate").innerText = stats.MessageRate.toFixed(1);
                }
            } else {
                document.getElementById("infoblockMessageRate").innerText = Strings.NotApplicable;
            }

            this.RefreshPageTitle(stats.TrackedAircrafts, stats.TrackedAircraftPositions, stats.MessageRate);
        }

        /**
         * Show or hide specific column in aircraft list.
         * @param columnId Column to show or hide
         * @param visible True if visible
         */
        private static AircraftListShowColumn(columnId: string, visible: boolean) {
            const table = document.getElementById("aircraftList") as HTMLTableElement;

            let index = 0;
            for (const c of table.rows.item(0).cells) {
                if (c.id === columnId) {
                    index = c.cellIndex;
                    break;
                }
            }

            for (const row of table.rows) {
                if (visible) {
                    row.cells.item(index).classList.remove("hidden");
                    row.cells.item(index).hidden = false;
                } else {
                    row.cells.item(index).classList.add("hidden");
                    row.cells.item(index).hidden = true;
                }
            }
        }

        /**
         * Eventhandler when display unit was changed through GUI.
         * @param e
         */
        private static OnDisplayUnitsChanged(e: any) {
            const displayUnits = e.target.value;
            AppSettings.DisplayUnits = displayUnits;
            if (AppSettings.DisplayUnits === "metric") {
                document.getElementById("altitudeChartButton").classList.add("altitudeMeters");
            } else {
                document.getElementById("altitudeChartButton").classList.remove("altitudeMeters");
            }
            Strings.OnLanguageChange();
            LMap.CreateSiteCircles();
            this.UpdateAircraftListColumnUnits();
            Filter.RefreshFilterList();
            this.GetAircraft("*"); // Refresh all aircrafts
        }

        /**
         * Get aircraft data from UI edit inputs and save in indexed database.
         */
        private static EditAircraftData() {
            const i24 = (document.getElementById("editIcao24") as HTMLInputElement).value.trim().substr(0, 6).toUpperCase();
            const r = (document.getElementById("editRegistration") as HTMLInputElement).value.trim().substr(0, 10).toUpperCase();
            const t = (document.getElementById("editType") as HTMLInputElement).value.trim().substr(0, 4).toUpperCase();
            const d = (document.getElementById("editDescription") as HTMLInputElement).value.trim().substr(0, 50);
            const civ = (document.getElementById("editMilitaryCheck") as HTMLInputElement).checked;
            const int = (document.getElementById("editInterestingCheck") as HTMLInputElement).checked;

            let f = "00";
            if (civ && !int) {
                f = "10";
            }
            if (!civ && int) {
                f = "01";
            }
            if (civ && int) {
                f = "11";
            }

            const entry = {
                desc: d,
                flags: f,
                icao24: i24,
                reg: r,
                type: t,
            };
            DatabaseFrontend.PutAircraftData(entry);
            $("#EditAircraftModal").modal("hide");
            this.GetAircraft(i24); // Refresh this aircraft
        }

        /**
         * Change language on user request.
         * @param e Event
         */
        private static OnLanguageChange(e: any) {
            let button = e.target as HTMLButtonElement;
            // Catch click on flag icon.
            if (button.tagName === "IMG") {
                // We want the button element, not the flag image.
                button = e.target.parentElement as HTMLButtonElement;
            }
            const btns = button.parentElement.getElementsByTagName("button") as HTMLCollection;
            for (const b of btns) {
                b.classList.remove("active");
            }
            button.classList.add("active");
            AppSettings.AppLanguage = button.id;
            this.SetLanguage(button.id);
        }

        /**
         * Forward sort by request to backend worker.
         * @param ev Table header cell event object
         */
        private static AircraftListSortBy(sortBy: eSortBy, ev: MouseEvent) {
            this.aircraftCollectionWorker.postMessage({ type: "SortBy", data: sortBy });
        }

        /**
         * Create tooltip for marker.
         */
        private static CreateToolTip(ac: IAircraft): string {
            let tip;
            let vsi = "";
            if (ac.VertRate > 256) {
                vsi = Strings.Climbing;
            } else if (ac.VertRate < -256) {
                vsi = Strings.Descending;
            } else {
                vsi = Strings.Level;
            }

            let altText;
            if (ac.AirGround === eAirGround.invalid || ac.AirGround === eAirGround.uncertain || ac.Altitude === null) {
                altText = "?";
            } else if (ac.AirGround === eAirGround.ground) {
                altText = Strings.Ground;
            } else {
                altText = Math.round(
                    Format.ConvertAltitude(
                        ac.Altitude,
                        AppSettings.DisplayUnits,
                    ),
                ) + Strings.AltitudeUnit;
            }

            const icao24 = ac.Icao.toUpperCase();
            const desc = ac.TypeDescription ? ac.TypeDescription : Strings.UnknownAircraftType;
            const species = ac.Species ? ac.Species : "";
            const flight = ac.Flight ? ac.Flight.trim() : Strings.UnknownFlight;
            const operator = ac.Operator ? ac.Operator : "";
            const registration = ac.Registration ? ac.Registration : "";
            const type = ac.IcaoType ? ac.IcaoType : "";
            if (AppSettings.ShowAdditionalData) {
                tip = `${flight} #${icao24} ${altText} ${vsi}\n${type} ${species}\n${operator}`;
            } else {
                tip = `#${icao24}\n${flight}\n${registration}\n${type}\n${altText}`;
            }
            return tip;
        }

        /**
         * Get color depending on altitude.
         * @param altitude Altitude number or ground string.
         */
        private static GetAltitudeColor(altitude: number): number[] {
            let h;
            let s;
            let l;

            // Round altitude to next full 500ft below or 1000ft above 10000ft.
            // This prevents changes in marker color on small changes in altitude
            // and therefore reduces periodical creation of marker icons.
            if (altitude > 10000) {
                altitude = Math.ceil((altitude + 1) / 1000) * 1000;
            } else {
                altitude = Math.ceil((altitude + 1) / 500) * 500;
            }

            if (altitude === null) {
                h = 0;
                s = 0;
                l = 40;
            } else if (isNaN(altitude)) {
                h = 120;
                s = 100;
                l = 30;
            } else {
                s = 85;
                l = 50;

                // find the pair of points the current altitude lies between,
                // and interpolate the hue between those points
                const hpoints = [
                    { alt: 2000, val: 20 },
                    { alt: 10000, val: 140 },
                    { alt: 40000, val: 300 },
                ];
                h = hpoints[0].val;
                for (let i = hpoints.length - 1; i >= 0; i -= 1) {
                    if (altitude > hpoints[i].alt) {
                        if (i === hpoints.length - 1) {
                            h = hpoints[i].val;
                        } else {
                            h = hpoints[i].val
                                + ((hpoints[i + 1].val - hpoints[i].val)
                                    * (altitude - hpoints[i].alt))
                                / (hpoints[i + 1].alt - hpoints[i].alt);
                        }
                        break;
                    }
                }
            }

            if (h < 0) {
                h = (h % 360) + 360;
            } else if (h >= 360) {
                h %= 360;
            }

            if (s < 5) {
                s = 5;
            } else if (s > 95) {
                s = 95;
            }

            if (l < 5) {
                l = 5;
            } else if (l > 95) {
                l = 95;
            }

            return [h, s, l];
        }

        private static GetMarkerColor(ac: IAircraft) {
            // Emergency squawks override everything else
            if (ac.Squawk in this.specialSquawks) {
                return this.specialSquawks[ac.Squawk].MarkerColor;
            }

            if (ac.AirGround === eAirGround.invalid || ac.AirGround === eAirGround.uncertain) {
                return "hsl(200, 18%, 46%)"; // Blue grey
            }

            if (ac.AirGround === eAirGround.ground) {
                return "hsl(16, 25%, 38%)"; // Brown
            }

            let h;
            let s;
            let l;

            const colorArr = this.GetAltitudeColor(ac.Altitude);

            [h, s, l] = colorArr;

            // If we have not seen a recent position update, change color
            if (ac.SeenPos > 15) {
                h += 0;
                s += -10;
                l += 30;
            }

            // If this marker is a mlat position, change color
            if (ac.PositionFromMlat) {
                h += 0;
                s += -10;
                l += -10;
            }

            if (h < 0) {
                h = (h % 360) + 360;
            } else if (h >= 360) {
                h %= 360;
            }

            if (s < 5) {
                s = 5;
            } else if (s > 95) {
                s = 95;
            }

            if (l < 5) {
                l = 5;
            } else if (l > 95) {
                l = 95;
            }
            return `hsl(${Math.round(h / 5) * 5},${Math.round(s / 5) * 5}%,${Math.round(l / 5) * 5}%)`;
        }

        /**
         * Create or move aircraft marker on map.
         * @param moved True if marker exists and just moved.
         */
        private static UpdateAircraftMarker(ac: IAircraft) {
            let marker = this.aircraftMarkers.get(ac.Icao);
            const fillColor = this.GetMarkerColor(ac);
            const strokeColor = "#000000";
            let refreshMarker = false;

            const scaleFactor = Math.max(
                0.2,
                Math.min(1.2, 0.2 * 1.25 ** AppSettings.ZoomLevel),
            );

            let rotation = ac.Track;
            if (rotation === null) {
                rotation = ac.TrueHeading;
            }
            if (rotation === null) {
                rotation = ac.MagHeading;
            }
            if (rotation === null) {
                rotation = 0;
            }

            const tip = this.CreateToolTip(ac);

            if (marker !== undefined) {
                if ((marker.options.icon as L.AircraftSvgIcon).options.typeDesignator !== ac.IcaoType) {
                    marker.remove();
                    refreshMarker = true;
                } else {
                    if ((marker.options.icon.options as L.IAircraftSvgIconOptions).noRotate || false) {
                        rotation = 0;
                    }

                    if (ac.Position !== null && ac.SeenPos < 60) {
                        marker.SetLatLngScaleRotationColor(ac.Position, scaleFactor, rotation, fillColor, strokeColor);
                        marker.setTooltipContent(tip);
                    }
                }
            }

            /* Create new marker for new aircrafts or replace "unknown" marker once we got a type designator. */
            if (marker === undefined || refreshMarker) {
                const icon = L.aircraftSvgIcon({
                    category: ac.Category,
                    id: ac.Icao,
                    tooltipAnchor: [0, -25],
                    typeDescription: ac.Species,
                    typeDesignator: ac.IcaoType,
                    wtc: ac.Wtc,
                });

                if (icon.options.noRotate || false) {
                    rotation = 0;
                }

                marker = L.aircraftMarker(ac.Position, {
                    draggable: false,
                    fillColor,
                    icao: ac.Icao,
                    icon,
                    keyboard: false,
                    rotation,
                    scale: scaleFactor,
                    strokeColor,
                });
                marker.bindTooltip(tip, {
                    direction: "right",
                    interactive: false,
                    opacity: 0.80,
                });
                LMap.AircraftPositions.addLayer(marker);
                this.aircraftMarkers.set(ac.Icao, marker);
            }

            marker.SelectAlertIdent((this.selectedAircraft === ac.Icao), ac.Alert, ac.SPIdent);
        }

        /**
         * Clear aircraft marker.
         */
        private static ClearMarker(icao: string) {
            const marker = this.aircraftMarkers.get(icao);
            if (marker !== undefined) {
                if (LMap.AircraftPositions.hasLayer(marker)) {
                    LMap.AircraftPositions.removeLayer(marker);
                }
                this.aircraftMarkers.delete(icao);
            }
        }

        /**
         * Update aircraft flight path trace.
         */
        private static UpdateTrace(icao: string, trace: number[][]) {
            let layer = this.aircraftTraces.get(icao);
            if (layer === undefined) {
                layer = L.featureGroup();
            }

            const showTooltip = AppSettings.ShowTraceDetails;
            const du = AppSettings.DisplayUnits;
            let hsl;
            let color;
            let l;
            let dashArray;
            const segmentCount = layer.getLayers().length || 1;
            if (trace.length > 1 && segmentCount === trace.length) {
                // Number of segments has not increased, update end of trace position in last segment.
                const lastSegment = layer.getLayers()[segmentCount - 1] as L.Polyline;
                const latlngs = lastSegment.getLatLngs();
                const lastPos: any = latlngs.pop();
                lastPos.lat = trace[trace.length - 1][0];
                lastPos.lng = trace[trace.length - 1][1];
                latlngs.push(lastPos);
                lastSegment.setLatLngs(latlngs);
                lastSegment.redraw();
            } else {
                // Number of segments has increased, add new segments to existing trace.
                for (let i = segmentCount; i < trace.length; i++) {
                    hsl = this.GetAltitudeColor(trace[i][2]);
                    color = `hsl(${Math.round(hsl[0] / 5) * 5},${Math.round(hsl[1] / 5) * 5}%,${Math.round(hsl[2] / 5) * 5}%)`;
                    if (trace[i][3]) {
                        dashArray = "3 3";
                    } else {
                        dashArray = "";
                    }

                    l = L.polyline([L.latLng(trace[i - 1][0], trace[i - 1][1]), L.latLng(trace[i][0], trace[i][1])], {
                        bubblingMouseEvents: true,
                        color,
                        dashArray,
                        weight: 1.5,
                    });

                    if (showTooltip) {
                        const t = new Intl.DateTimeFormat(navigator.language, { hour: "2-digit", minute: "2-digit" }).format(new Date(trace[i][4] * 1000));
                        l.bindTooltip(`${t}\n${Format.AltitudeLong(trace[i][2], 0, du)}`, {
                            direction: "right",
                            interactive: false,
                            offset: L.point(0, -15),
                            opacity: 0.80,
                        });
                    }
                    l.addTo(layer);
                }

                if (segmentCount === 1) {
                    // Add new trace to map
                    layer.addTo(LMap.AircraftTraces);
                }
            }
            this.aircraftTraces.set(icao, layer);
        }

        /**
         * Remove aircraft flight path trace from map.
         */
        private static ClearTrace(icao: string) {
            const layer = this.aircraftTraces.get(icao);
            if (layer !== undefined) {
                LMap.AircraftTraces.removeLayer(layer);
                layer.clearLayers();
                this.aircraftTraces.delete(icao);
            }
        }

    }
}
