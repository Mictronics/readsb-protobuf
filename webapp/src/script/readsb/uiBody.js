"use strict";
var READSB;
(function (READSB) {
    class Body {
        static Init() {
            this.rowTemplate = document.getElementById("aircraftListRowTemplate");
            READSB.Input.Init();
            READSB.Filter.Init();
            this.SetLanguage(READSB.AppSettings.AppLanguage);
            this.ShowFlags(READSB.AppSettings.ShowFlags);
            this.AircraftListSetColumnVisibility(false);
            if (typeof READSB.AppSettings.SiteLat === "number" && typeof READSB.AppSettings.SiteLon === "number") {
                READSB.Input.SetSiteCoordinates();
            }
            else {
                this.AircraftListShowColumn("#aircraftListDistance", false);
            }
            this.aircraftCollectionWorker = new Worker("./script/readsb/backend/aircraftCollection.js", { name: "AircraftCollectionWorker" });
            this.aircraftCollectionWorker.addEventListener("message", this.OnAircraftCollectionWorkerMessage.bind(this));
            $(".toast").toast({ autohide: false, animation: false });
            $(".toast").toast("hide");
            document.getElementById("editIcao24").addEventListener("click", () => {
                $("#EditConfirmModal").modal("show");
            });
            document.getElementById("editAircraftButton").addEventListener("click", () => {
                $("#EditAircraftModal").modal("show");
                document.getElementById("editRegistration").focus();
            });
            document.getElementById("editAircraftSaveButton").addEventListener("click", () => {
                this.EditAircraftData();
            });
            document.title = READSB.AppSettings.PageName;
            document.getElementById("infoblockName").innerText = READSB.AppSettings.PageName;
            document.getElementById("inputPageName").value = READSB.AppSettings.PageName;
            if (READSB.AppSettings.ShowAltitudeChart) {
                document.getElementById("altitudeChart").classList.remove("hidden");
            }
            else {
                document.getElementById("altitudeChart").classList.add("hidden");
            }
            if (READSB.AppSettings.UseDarkTheme) {
                document.documentElement.setAttribute("data-theme", "dark");
            }
            else {
                document.documentElement.setAttribute("data-theme", "light");
            }
            const selectInfoBlockDrag = new READSB.Draggable(document.getElementById("selectedInfoblock"));
            document.getElementById("aircraftListIcao").addEventListener("click", this.AircraftListSortBy.bind(this, READSB.eSortBy.Icao));
            document.getElementById("aircraftListFlag").addEventListener("click", this.AircraftListSortBy.bind(this, READSB.eSortBy.Country));
            document.getElementById("aircraftListFlight").addEventListener("click", this.AircraftListSortBy.bind(this, READSB.eSortBy.Flight));
            document.getElementById("aircraftListRegistration").addEventListener("click", this.AircraftListSortBy.bind(this, READSB.eSortBy.Registration));
            document.getElementById("aircraftListCivilMil").addEventListener("click", this.AircraftListSortBy.bind(this, READSB.eSortBy.CivilMil));
            document.getElementById("aircraftListType").addEventListener("click", this.AircraftListSortBy.bind(this, READSB.eSortBy.Type));
            document.getElementById("aircraftListSquawk").addEventListener("click", this.AircraftListSortBy.bind(this, READSB.eSortBy.Squawk));
            document.getElementById("aircraftListAltitude").addEventListener("click", this.AircraftListSortBy.bind(this, READSB.eSortBy.Altitude));
            document.getElementById("aircraftListSpeed").addEventListener("click", this.AircraftListSortBy.bind(this, READSB.eSortBy.Speed));
            document.getElementById("aircraftListVerticalRate").addEventListener("click", this.AircraftListSortBy.bind(this, READSB.eSortBy.VerticalRate));
            document.getElementById("aircraftListDistance").addEventListener("click", this.AircraftListSortBy.bind(this, READSB.eSortBy.Distance));
            document.getElementById("aircraftListTrack").addEventListener("click", this.AircraftListSortBy.bind(this, READSB.eSortBy.Track));
            document.getElementById("aircraftListMessages").addEventListener("click", this.AircraftListSortBy.bind(this, READSB.eSortBy.Messages));
            document.getElementById("aircraftListSeen").addEventListener("click", this.AircraftListSortBy.bind(this, READSB.eSortBy.Seen));
            document.getElementById("aircraftListRssi").addEventListener("click", this.AircraftListSortBy.bind(this, READSB.eSortBy.Rssi));
            document.getElementById("aircraftListLat").addEventListener("click", this.AircraftListSortBy.bind(this, READSB.eSortBy.Latitude));
            document.getElementById("aircraftListLon").addEventListener("click", this.AircraftListSortBy.bind(this, READSB.eSortBy.Longitude));
            document.getElementById("exportDatabaseButton").addEventListener("click", READSB.DatabaseFrontend.ExportDB.bind(READSB.DatabaseFrontend));
            document.getElementById("importDatabaseButton").addEventListener("change", READSB.DatabaseFrontend.ImportDB.bind(READSB.DatabaseFrontend));
            document.getElementById("toggle-follow-icon").addEventListener("click", () => {
                this.followSelected = !this.followSelected;
                if (this.followSelected) {
                    if (READSB.LMap.ZoomLevel < 8) {
                        READSB.LMap.ZoomLevel = 8;
                    }
                    document.getElementById("toggle-follow-icon").classList.replace("follow-unlock-icon", "follow-lock-icon");
                }
                else {
                    document.getElementById("toggle-follow-icon").classList.replace("follow-lock-icon", "follow-unlock-icon");
                }
            });
            document.getElementById("filter-selected-icon").addEventListener("click", () => {
                if (this.selectedAircraft) {
                    READSB.Filter.AircraftByAddress(this.selectedAircraft);
                }
            });
            if (READSB.AppSettings.DisplayUnits === null) {
                READSB.AppSettings.DisplayUnits = "nautical";
            }
            const unitsSelector = document.getElementById("unitsSelector");
            unitsSelector.value = READSB.AppSettings.DisplayUnits;
            unitsSelector.addEventListener("change", this.OnDisplayUnitsChanged.bind(this));
            if (READSB.AppSettings.DisplayUnits === "metric") {
                document.getElementById("altitudeChartButton").classList.add("altitudeMeters");
            }
            else {
                document.getElementById("altitudeChartButton").classList.remove("altitudeMeters");
            }
            const btns = document.getElementById("langDropdownItems").getElementsByTagName("button");
            for (const btn of btns) {
                btn.addEventListener("click", this.OnLanguageChange.bind(this));
                if (btn.id === READSB.AppSettings.AppLanguage) {
                    btn.classList.add("active");
                }
            }
        }
        static AircraftListSetColumnVisibility(visible) {
            this.AircraftListShowColumn("aircraftListRegistration", visible);
            this.AircraftListShowColumn("aircraftListType", visible);
            this.AircraftListShowColumn("aircraftListVerticalRate", visible);
            this.AircraftListShowColumn("aircraftListRssi", visible);
            this.AircraftListShowColumn("aircraftListLat", visible);
            this.AircraftListShowColumn("aircraftListLon", visible);
            this.AircraftListShowColumn("aircraftListMessages", visible);
            this.AircraftListShowColumn("aircraftListSeen", visible);
            this.AircraftListShowColumn("aircraftListTrack", visible);
            this.AircraftListShowColumn("aircraftListFlag", READSB.AppSettings.ShowFlags);
        }
        static GetAircraftListRowTemplate() {
            return document.getElementById("aircraftListRowTemplate");
        }
        static UpdateAircraftListColumnUnits() {
            document.getElementById("aircraftListAltitudeUnit").textContent = READSB.Strings.AltitudeUnit;
            document.getElementById("aircraftListSpeedUnit").textContent = READSB.Strings.SpeedUnit;
            document.getElementById("aircraftListDistanceUnit").textContent = READSB.Strings.DistanceUnit;
            document.getElementById("aircraftListVerticalRateUnit").textContent = READSB.Strings.VerticalRateUnit;
        }
        static UpdateErrorToast(text, show) {
            if (this.errorToastStatus === show) {
                return;
            }
            document.getElementsByClassName("toast-body").item(0).textContent = text;
            if (show) {
                $(".toast").toast("show");
            }
            else {
                $(".toast").toast("hide");
            }
            this.errorToastStatus = show;
        }
        static ShowFlags(show) {
            if (show) {
                this.rowTemplate.cells[1].classList.remove("hidden");
                this.rowTemplate.cells[1].hidden = false;
                document.getElementById("aircraftListFlag").classList.remove("hidden");
                document.getElementById("infoblockCountry").classList.remove("hidden");
            }
            else {
                this.rowTemplate.cells[1].classList.add("hidden");
                this.rowTemplate.cells[1].hidden = true;
                document.getElementById("aircraftListFlag").classList.add("hidden");
                document.getElementById("infoblockCountry").classList.add("hidden");
            }
        }
        static SelectAll(all) {
            if (all) {
                this.selectedAircraft = "*";
                this.GetAircraft("*");
            }
            else {
                READSB.LMap.AircraftTraces.clearLayers();
                this.aircraftTraces.clear();
                this.selectedAircraft = null;
            }
            this.RefreshSelectedAircraft(null);
        }
        static SelectAircraftByIcao(icao, autofollow) {
            if (this.selectedAircraft === icao && !autofollow) {
                icao = null;
            }
            this.SelectAll(false);
            if (this.selectedAircraft !== null) {
                this.ClearTrace(this.selectedAircraft);
                this.RefreshSelectedAircraft(null);
            }
            if (icao !== null) {
                this.selectedAircraft = icao;
                this.GetAircraft(icao);
            }
            else {
                this.selectedAircraft = null;
                this.RefreshSelectedAircraft(null);
            }
            if (this.selectedAircraft !== null && autofollow) {
                this.followSelected = true;
            }
            else {
                this.followSelected = false;
            }
        }
        static GetAircraft(icao) {
            this.aircraftCollectionWorker.postMessage({ type: "Aircraft", data: icao });
        }
        static SetSitePosition() {
            this.aircraftCollectionWorker.postMessage({ type: "SitePosition", data: [READSB.AppSettings.SiteLat, READSB.AppSettings.SiteLon] });
        }
        static OnAircraftCollectionWorkerMessage(ev) {
            const msg = ev.data;
            switch (msg.type) {
                case "Port":
                    this.aircraftTraceCollector = msg.data;
                    this.aircraftTraceCollector.onmessage = (evt) => {
                        const msg2 = evt.data;
                        if (msg2.type === "Trace") {
                            this.UpdateTrace(msg2.data[0], msg2.data[1]);
                        }
                    };
                    break;
                case "ReceiverPosition":
                    READSB.AppSettings.SiteLat = msg.data[0];
                    READSB.AppSettings.SiteLon = msg.data[1];
                    READSB.Input.SetSiteCoordinates();
                    break;
                case "Error":
                    if (msg.data === false) {
                        this.UpdateErrorToast("", false);
                    }
                    else {
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
                    const tbody = document.getElementById("aircraftList").tBodies[0];
                    for (const [pos, icao] of msg.data.entries()) {
                        const r = document.getElementById(icao);
                        if (r !== null && pos !== r.sectionRowIndex) {
                            tbody.insertBefore(r, tbody.rows[pos]);
                        }
                    }
                    break;
                case "Range":
                    READSB.LMap.CreateSiteCircles(msg.data);
                    break;
                default:
                    break;
            }
        }
        static SetLanguage(lng) {
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
                READSB.Strings.OnLanguageChange();
                Body.UpdateAircraftListColumnUnits();
                if (!READSB.LMap.Initialized) {
                    READSB.LMap.Init();
                    READSB.Filter.RestoreSessionFilters();
                }
            });
        }
        static OnAircraftListRowClick(h, evt) {
            if (evt.srcElement instanceof HTMLAnchorElement) {
                evt.stopPropagation();
                return;
            }
            this.SelectAircraftByIcao(h, false);
            evt.preventDefault();
        }
        static OnAircraftListRowDoubleClick(h, evt) {
            this.SelectAircraftByIcao(h, true);
            evt.preventDefault();
        }
        static RefreshAircraftInformation(pos, ac) {
            if (!READSB.LMap.Initialized) {
                return;
            }
            let isFiltered = false;
            let isHighlight = false;
            if (READSB.AppSettings.EnableFilter) {
                for (const f of READSB.AircraftFilterCollection) {
                    isFiltered = f.IsFiltered(ac);
                    if (isFiltered === true) {
                        break;
                    }
                }
                if (READSB.AppSettings.EnableHighlightFilter) {
                    isHighlight = true;
                    if (isFiltered === true) {
                        isHighlight = false;
                    }
                    isFiltered = false;
                }
            }
            const mapBounds = READSB.LMap.MapViewBounds;
            let hideOutOfBounds = false;
            if (mapBounds && ac.Position !== null) {
                hideOutOfBounds = !mapBounds.contains(ac.Position) && READSB.AppSettings.HideAircraftsNotInView;
            }
            if (!hideOutOfBounds && !isFiltered && ac.Position !== null && ac.SeenPos < 60) {
                this.UpdateAircraftMarker(ac);
                if (this.selectedAircraft === ac.Icao || this.selectedAircraft === "*") {
                    this.aircraftTraceCollector.postMessage({ type: "Get", data: ac.Icao });
                }
            }
            else {
                this.ClearMarker(ac.Icao);
                this.ClearTrace(ac.Icao);
            }
            if (this.selectedAircraft === ac.Icao) {
                this.RefreshSelectedAircraft(ac);
            }
            const tbody = document.getElementById("aircraftList").tBodies[0];
            let r = document.getElementById(ac.Icao);
            if (!ac.VisibleInList && r === null) {
                return;
            }
            else if ((isFiltered || !ac.VisibleInList || hideOutOfBounds) && r !== null) {
                const range = document.createRange();
                range.selectNodeContents(r);
                range.deleteContents();
                r.removeEventListener("click", Body.OnAircraftListRowClick.bind(Body, ac.Icao));
                r.removeEventListener("dblclick", Body.OnAircraftListRowDoubleClick.bind(Body, ac.Icao));
                tbody.removeChild(r);
                return;
            }
            else if (ac.VisibleInList && r === null) {
                if (isFiltered || hideOutOfBounds) {
                    return;
                }
                r = this.rowTemplate.cloneNode(true);
                r.id = ac.Icao;
                if (ac.Icao[0] === "~") {
                    r.cells[0].textContent = ac.Icao.substring(1).toUpperCase();
                    r.style.fontStyle = "italic";
                }
                else {
                    r.cells[0].textContent = ac.Icao.toUpperCase();
                }
                if (!r.cells[1].hidden && ac.IcaoRange.FlagImage !== null) {
                    r.cells[1].getElementsByTagName("img")[0].src = READSB.AppSettings.FlagPath + ac.IcaoRange.FlagImage;
                    r.cells[1].getElementsByTagName("img")[0].title = ac.IcaoRange.Country;
                }
                r.addEventListener("click", Body.OnAircraftListRowClick.bind(Body, ac.Icao));
                r.addEventListener("dblclick", Body.OnAircraftListRowDoubleClick.bind(Body, ac.Icao));
                tbody.appendChild(r);
            }
            let classes = "aircraftListRow";
            if (ac.Position !== null && ac.SeenPos < 60) {
                if (ac.PositionFromMlat) {
                    classes += " mlat";
                }
                else {
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
            if (READSB.AppSettings.ShowFlags) {
                r.cells[1].className = "showFlags prio-2";
            }
            else {
                r.cells[1].className = "hideFlags";
            }
            if (ac.Flight) {
                r.cells[2].textContent = ac.Flight;
                if (ac.Operator !== null) {
                    r.cells[2].title = ac.Operator;
                }
            }
            else {
                r.cells[2].textContent = "";
            }
            let alt = READSB.Format.AltitudeBrief(ac.Altitude, ac.VertRate, READSB.AppSettings.DisplayUnits);
            if (ac.AirGround === READSB.eAirGround.ground) {
                alt = READSB.Strings.Ground;
            }
            if (!r.cells[3].hidden) {
                r.cells[3].textContent = (ac.Registration !== null ? ac.Registration : "");
            }
            if (!r.cells[4].hidden) {
                r.cells[4].textContent = (ac.CivilMil !== null ? (ac.CivilMil === true ? READSB.Strings.MilitaryShort : READSB.Strings.CivilShort) : "");
            }
            if (!r.cells[5].hidden) {
                r.cells[5].textContent = (ac.IcaoType !== null ? ac.IcaoType : "");
            }
            if (!r.cells[6].hidden) {
                r.cells[6].textContent = (ac.Squawk !== null ? ac.Squawk : "");
            }
            if (!r.cells[7].hidden) {
                r.cells[7].textContent = alt;
            }
            if (!r.cells[8].hidden) {
                r.cells[8].textContent = READSB.Format.SpeedBrief(ac.Speed, READSB.AppSettings.DisplayUnits);
            }
            if (!r.cells[9].hidden) {
                r.cells[9].textContent = READSB.Format.VerticalRateBrief(ac.VertRate, READSB.AppSettings.DisplayUnits);
            }
            if (!r.cells[10].hidden) {
                r.cells[10].textContent = READSB.Format.DistanceBrief(ac.SiteDist, READSB.AppSettings.DisplayUnits);
            }
            if (!r.cells[11].hidden) {
                r.cells[11].textContent = READSB.Format.TrackBrief(ac.Track);
            }
            if (!r.cells[12].hidden) {
                r.cells[12].textContent = (ac.Messages !== null ? ac.Messages.toString() : "");
            }
            if (!r.cells[13].hidden) {
                r.cells[13].textContent = ac.Seen.toFixed(0);
            }
            if (!r.cells[14].hidden) {
                r.cells[14].textContent = (ac.Rssi !== null ? ac.Rssi.toFixed(1) : "");
            }
            if (!r.cells[15].hidden) {
                r.cells[15].textContent = (ac.Position !== null ? ac.Position.lat.toFixed(4) : "");
            }
            if (!r.cells[16].hidden) {
                r.cells[16].textContent = (ac.Position !== null ? ac.Position.lng.toFixed(4) : "");
            }
            r.className = classes;
        }
        static RefreshSelectedAircraft(ac) {
            if (this.selectedAircraft !== null && this.selectedAircraft !== "*") {
                document.getElementById("selectedInfoblock").classList.remove("hidden");
            }
            else {
                document.getElementById("selectedInfoblock").classList.add("hidden");
            }
            if (ac === null) {
                return;
            }
            document.getElementById("editIcao24").value = ac.Icao.toUpperCase();
            if (ac.Registration !== null) {
                if (ac.Registration.startsWith("#")) {
                    document.getElementById("editRegistration").value = ac.Registration.substr(2).toUpperCase();
                }
                else {
                    document.getElementById("editRegistration").value = ac.Registration.toUpperCase();
                }
            }
            if (ac.IcaoType !== null) {
                document.getElementById("editType").value = ac.IcaoType.toUpperCase();
            }
            if (ac.TypeDescription !== null) {
                document.getElementById("editDescription").value = ac.TypeDescription;
            }
            if (ac.Interesting !== null && ac.Interesting) {
                document.getElementById("editInterestingCheck").checked = true;
            }
            else {
                document.getElementById("editInterestingCheck").checked = false;
            }
            if (ac.CivilMil !== null && ac.CivilMil) {
                document.getElementById("editMilitaryCheck").checked = true;
            }
            else {
                document.getElementById("editMilitaryCheck").checked = false;
            }
            if (ac.Flight !== null && ac.Flight !== "") {
                document.getElementById("selectedFlightId").innerHTML = ac.ExternalInfoLink;
            }
            else {
                document.getElementById("selectedFlightId").innerText = READSB.Strings.NotApplicable;
            }
            if (ac.Operator !== null) {
                document.getElementById("selectedOperator").innerText = ac.Operator;
                document.getElementById("infoblockOperator").classList.remove("hidden");
            }
            else {
                document.getElementById("infoblockOperator").classList.add("hidden");
            }
            if (ac.Callsign !== null && ac.Callsign !== "") {
                document.getElementById("selectedCallsign").innerText = ac.Callsign;
                document.getElementById("infoblockCallsign").classList.remove("hidden");
            }
            else {
                document.getElementById("infoblockCallsign").classList.add("hidden");
            }
            if (ac.Registration !== null) {
                document.getElementById("selectedRegistration").innerText = ac.Registration;
            }
            else {
                document.getElementById("selectedRegistration").innerText = "";
            }
            if (ac.IcaoType !== null) {
                document.getElementById("selectedIcaoType").innerText = ac.IcaoType;
            }
            else {
                document.getElementById("selectedIcaoType").innerText = "";
            }
            if (ac.TypeDescription !== null) {
                document.getElementById("selectedDescription").innerText = ac.TypeDescription;
                document.getElementById("selectedIcaoType").innerText = "";
            }
            else {
                document.getElementById("selectedDescription").innerText = "";
            }
            const emerg = document.getElementById("selectedEmergency");
            if (ac.Squawk in this.specialSquawks) {
                emerg.className = this.specialSquawks[ac.Squawk].CssClass;
                emerg.textContent = "\u00a0" + "Squawking: " + this.specialSquawks[ac.Squawk].Text + "\u00a0";
            }
            else {
                emerg.className = "hidden";
            }
            if (ac.AirGround === READSB.eAirGround.ground) {
                document.getElementById("selectedAltitude").innerText = READSB.Strings.Ground;
            }
            else {
                document.getElementById("selectedAltitude").innerText = READSB.Format.AltitudeLong(ac.Altitude, ac.VertRate, READSB.AppSettings.DisplayUnits);
            }
            if (ac.Squawk === null || ac.Squawk === "0000") {
                document.getElementById("selectedSquawk").innerText = READSB.Strings.NotApplicable;
            }
            else {
                document.getElementById("selectedSquawk").innerText = ac.Squawk;
            }
            document.getElementById("selectedIcao").innerText = ac.Icao.toUpperCase();
            document.getElementById("selectedIcao").href = "https://www.planespotters.net/search?q=" + ac.Icao;
            document.getElementById("selectedSpeedGs").innerText = READSB.Format.SpeedLong(ac.Gs, READSB.AppSettings.DisplayUnits);
            document.getElementById("selectedVerticalRate").innerText = READSB.Format.VerticalRateLong(ac.VertRate, READSB.AppSettings.DisplayUnits);
            document.getElementById("selectedTrack").innerText = READSB.Format.TrackLong(ac.Track);
            if (ac.Seen <= 1) {
                document.getElementById("selectedSeen").innerText = READSB.Strings.Now;
            }
            else {
                document.getElementById("selectedSeen").innerText = ac.Seen + READSB.Strings.TimeUnit;
            }
            if (ac.CivilMil !== null) {
                if (ac.CivilMil === true) {
                    document.getElementById("selectedCivilMil").innerText = READSB.Strings.Military;
                }
                else {
                    document.getElementById("selectedCivilMil").innerText = READSB.Strings.Civil;
                }
            }
            else {
                document.getElementById("selectedCivilMil").innerText = "Country of";
            }
            if (ac.Interesting !== null && ac.Interesting === true) {
                document.getElementById("infoblockHead").classList.add("interesting");
            }
            else {
                document.getElementById("infoblockHead").classList.remove("interesting");
            }
            document.getElementById("selectedCountry").innerText = ac.IcaoRange.Country;
            if (READSB.AppSettings.ShowFlags && ac.IcaoRange.FlagImage !== null) {
                const sf = document.getElementById("selectedFlag");
                sf.classList.remove("hidden");
                (sf.firstElementChild).src = READSB.AppSettings.FlagPath + ac.IcaoRange.FlagImage;
                (sf.firstElementChild).title = ac.IcaoRange.Country;
            }
            else {
                document.getElementById("selectedFlag").classList.add("hidden");
            }
            if (ac.Position === null) {
                document.getElementById("selectedPosition").innerText = READSB.Strings.NotApplicable;
            }
            else {
                document.getElementById("selectedPosition").innerText = READSB.Format.LatLong(ac.Position);
                if (this.followSelected) {
                    READSB.LMap.Center = ac.Position;
                }
            }
            document.getElementById("selectedSource").innerText = READSB.Format.DataSource(ac.DataSource);
            document.getElementById("selectedSiteDist").innerText = READSB.Format.DistanceLong(ac.SiteDist, READSB.AppSettings.DisplayUnits);
            document.getElementById("selectedRssi").innerText = ac.Rssi.toFixed(1) + " dBFS";
            document.getElementById("selectedMessageCount").innerText = ac.Messages.toString();
            document.getElementById("selectedAltitudeGeom").innerText = READSB.Format.AltitudeLong(ac.AltGeom, ac.GeomRate, READSB.AppSettings.DisplayUnits);
            document.getElementById("selectedHeadingMag").innerText = READSB.Format.TrackLong(ac.MagHeading);
            document.getElementById("selectedHeadingTrue").innerText = READSB.Format.TrackLong(ac.TrueHeading);
            document.getElementById("selectedSpeedIas").innerText = READSB.Format.SpeedLong(ac.Ias, READSB.AppSettings.DisplayUnits);
            document.getElementById("selectedSpeedTas").innerText = READSB.Format.SpeedLong(ac.Tas, READSB.AppSettings.DisplayUnits);
            if (ac.Mach === null) {
                document.getElementById("selectedSpeedMach").innerText = READSB.Strings.NotApplicable;
            }
            else {
                document.getElementById("selectedSpeedMach").innerText = ac.Mach.toFixed(3);
            }
            if (ac.TrackRate === null) {
                document.getElementById("selectedTrackRate").innerText = READSB.Strings.NotApplicable;
            }
            else {
                document.getElementById("selectedTrackRate").innerText = ac.TrackRate.toFixed(2);
            }
            document.getElementById("selectedGeomRate").innerText = READSB.Format.VerticalRateLong(ac.GeomRate, READSB.AppSettings.DisplayUnits);
            if (ac.NavQnh === null) {
                document.getElementById("selectedNavQnh").innerText = READSB.Strings.NotApplicable;
            }
            else {
                document.getElementById("selectedNavQnh").innerText = ac.NavQnh.toFixed(1) + READSB.Strings.PressureUnit;
            }
            document.getElementById("selectedNavAltitude").innerText = READSB.Format.AltitudeLong(ac.NavAltitude, 0, READSB.AppSettings.DisplayUnits);
            document.getElementById("selectedNavHeading").innerText = READSB.Format.TrackLong(ac.NavHeading);
            if (ac.NavModes === null) {
                document.getElementById("selectedNavModes").innerText = READSB.Strings.NotApplicable;
            }
            else {
                document.getElementById("selectedNavModes").innerText = ac.NavModes.join();
            }
            if (ac.NicBaro === null) {
                document.getElementById("selectedNicBaro").innerText = READSB.Strings.NotApplicable;
            }
            else {
                if (ac.NicBaro === 1) {
                    document.getElementById("selectedNicBaro").innerText = READSB.Strings.CrossChecked;
                }
                else {
                    document.getElementById("selectedNicBaro").innerText = READSB.Strings.NotCrossChecked;
                }
            }
            document.getElementById("selectedNacp").innerText = READSB.Format.NacP(ac.NacP);
            document.getElementById("selectedNacv").innerText = READSB.Format.NacV(ac.NacV);
            if (ac.Rc === null) {
                document.getElementById("selectedRc").innerText = READSB.Strings.NotApplicable;
            }
            else if (ac.Rc === 0) {
                document.getElementById("selectedRc").innerText = READSB.Strings.Unknown;
            }
            else {
                document.getElementById("selectedRc").innerText = READSB.Format.DistanceShort(ac.Rc, READSB.AppSettings.DisplayUnits);
            }
            if (ac.Sil === null || ac.SilType === null) {
                document.getElementById("selectedSil").innerText = READSB.Strings.NotApplicable;
            }
            else {
                let sampleRate = "";
                let silDesc = "";
                if (ac.SilType === "perhour") {
                    sampleRate = READSB.Strings.PerHour;
                }
                else if (ac.SilType === "persample") {
                    sampleRate = READSB.Strings.PerSample;
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
                        silDesc = READSB.Strings.NotApplicable;
                        sampleRate = "";
                        break;
                }
                document.getElementById("selectedSil").innerHTML = silDesc + sampleRate;
            }
            if (ac.Version === null) {
                document.getElementById("selectedAdsbVersion").innerText = READSB.Strings.None;
            }
            else if (ac.Version === 0) {
                document.getElementById("selectedAdsbVersion").innerText = "v0 (DO-260)";
            }
            else if (ac.Version === 1) {
                document.getElementById("selectedAdsbVersion").innerText = "v1 (DO-260A)";
            }
            else if (ac.Version === 2) {
                document.getElementById("selectedAdsbVersion").innerText = "v2 (DO-260B)";
            }
            else {
                document.getElementById("selectedAdsbVersion").innerText = "v" + ac.Version;
            }
            if (ac.Declination !== null) {
                document.getElementById("selectedDeclination").innerText = `${ac.Declination.toFixed(1)}°`;
            }
            if (ac.WindDirection !== null && ac.WindSpeed !== null) {
                document.getElementById("selectedWindSpeed").innerText = READSB.Format.SpeedLong(ac.WindSpeed, READSB.AppSettings.DisplayUnits);
                document.getElementById("selectedWindDirection").innerText = READSB.Format.TrackLong(ac.WindDirection);
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
            }
            else {
                document.getElementById("windArrow").classList.add("hidden");
                document.getElementById("selectedWindSpeed").innerText = READSB.Strings.NotApplicable;
                document.getElementById("selectedWindDirection").innerText = READSB.Strings.NotApplicable;
            }
        }
        static RefreshPageTitle(trackedAircraft, trackedPositions, messageRate) {
            if (!READSB.AppSettings.ShowAircraftCountInTitle && !READSB.AppSettings.ShowMessageRateInTitle) {
                document.title = READSB.AppSettings.PageName;
                return;
            }
            let subtitle = "";
            if (READSB.AppSettings.ShowAircraftCountInTitle) {
                subtitle += `${trackedAircraft}/${trackedPositions}`;
            }
            if (READSB.AppSettings.ShowMessageRateInTitle && messageRate !== null) {
                if (subtitle) {
                    subtitle += " | ";
                }
                subtitle += ` - ${(messageRate / 1E03).toFixed(1)}k/s`;
            }
            document.title = `${READSB.AppSettings.PageName} - ${subtitle}`;
        }
        static RefreshInfoBlock(stats) {
            document.getElementById("infoblockVersion").innerText = stats.Version;
            document.getElementById("infoblockTotalAircraft").innerText = stats.TrackedAircrafts + "/" + stats.TrackedAircraftUnknown;
            document.getElementById("infoblockTotalAircraftPositions").innerText = stats.TrackedAircraftPositions.toString();
            if (stats.TrackedHistorySize >= 1E06) {
                document.getElementById("infoblockTotalHistory").innerText = (stats.TrackedHistorySize / 1E06).toFixed(1) + "M";
            }
            else if (stats.TrackedHistorySize >= 1E03) {
                document.getElementById("infoblockTotalHistory").innerText = (stats.TrackedHistorySize / 1E03).toFixed(2) + "k";
            }
            else {
                document.getElementById("infoblockTotalHistory").innerText = stats.TrackedHistorySize.toString();
            }
            if (stats.MessageRate !== null) {
                if (stats.MessageRate >= 1E06) {
                    document.getElementById("infoblockMessageRate").innerText = (stats.MessageRate / 1E06).toFixed(1) + "M";
                }
                else if (stats.MessageRate >= 1E03) {
                    document.getElementById("infoblockMessageRate").innerText = (stats.MessageRate / 1E03).toFixed(1) + "k";
                }
                else {
                    document.getElementById("infoblockMessageRate").innerText = stats.MessageRate.toFixed(1);
                }
            }
            else {
                document.getElementById("infoblockMessageRate").innerText = READSB.Strings.NotApplicable;
            }
            this.RefreshPageTitle(stats.TrackedAircrafts, stats.TrackedAircraftPositions, stats.MessageRate);
        }
        static AircraftListShowColumn(columnId, visible) {
            const table = document.getElementById("aircraftList");
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
                }
                else {
                    row.cells.item(index).classList.add("hidden");
                    row.cells.item(index).hidden = true;
                }
            }
        }
        static OnDisplayUnitsChanged(e) {
            const displayUnits = e.target.value;
            READSB.AppSettings.DisplayUnits = displayUnits;
            if (READSB.AppSettings.DisplayUnits === "metric") {
                document.getElementById("altitudeChartButton").classList.add("altitudeMeters");
            }
            else {
                document.getElementById("altitudeChartButton").classList.remove("altitudeMeters");
            }
            READSB.Strings.OnLanguageChange();
            READSB.LMap.CreateSiteCircles();
            this.UpdateAircraftListColumnUnits();
            READSB.Filter.RefreshFilterList();
            this.GetAircraft("*");
        }
        static EditAircraftData() {
            const i24 = document.getElementById("editIcao24").value.trim().substr(0, 6).toUpperCase();
            const r = document.getElementById("editRegistration").value.trim().substr(0, 10).toUpperCase();
            const t = document.getElementById("editType").value.trim().substr(0, 4).toUpperCase();
            const d = document.getElementById("editDescription").value.trim().substr(0, 50);
            const civ = document.getElementById("editMilitaryCheck").checked;
            const int = document.getElementById("editInterestingCheck").checked;
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
            READSB.DatabaseFrontend.PutAircraftData(entry);
            $("#EditAircraftModal").modal("hide");
            this.GetAircraft(i24);
        }
        static OnLanguageChange(e) {
            let button = e.target;
            if (button.tagName === "IMG") {
                button = e.target.parentElement;
            }
            const btns = button.parentElement.getElementsByTagName("button");
            for (const b of btns) {
                b.classList.remove("active");
            }
            button.classList.add("active");
            READSB.AppSettings.AppLanguage = button.id;
            this.SetLanguage(button.id);
        }
        static AircraftListSortBy(sortBy, ev) {
            this.aircraftCollectionWorker.postMessage({ type: "SortBy", data: sortBy });
        }
        static CreateToolTip(ac) {
            let tip;
            let vsi = "";
            if (ac.VertRate > 256) {
                vsi = READSB.Strings.Climbing;
            }
            else if (ac.VertRate < -256) {
                vsi = READSB.Strings.Descending;
            }
            else {
                vsi = READSB.Strings.Level;
            }
            let altText;
            if (ac.AirGround === READSB.eAirGround.invalid || ac.AirGround === READSB.eAirGround.uncertain || ac.Altitude === null) {
                altText = "?";
            }
            else if (ac.AirGround === READSB.eAirGround.ground) {
                altText = READSB.Strings.Ground;
            }
            else {
                altText = Math.round(READSB.Format.ConvertAltitude(ac.Altitude, READSB.AppSettings.DisplayUnits)) + READSB.Strings.AltitudeUnit;
            }
            const icao24 = ac.Icao.toUpperCase();
            const desc = ac.TypeDescription ? ac.TypeDescription : READSB.Strings.UnknownAircraftType;
            const species = ac.Species ? ac.Species : "";
            const flight = ac.Flight ? ac.Flight.trim() : READSB.Strings.UnknownFlight;
            const operator = ac.Operator ? ac.Operator : "";
            const registration = ac.Registration ? ac.Registration : "";
            const type = ac.IcaoType ? ac.IcaoType : "";
            if (READSB.AppSettings.ShowAdditionalData) {
                tip = `${flight} #${icao24} ${altText} ${vsi}\n${type} ${species}\n${operator}`;
            }
            else {
                tip = `#${icao24}\n${flight}\n${registration}\n${type}\n${altText}`;
            }
            return tip;
        }
        static GetAltitudeColor(altitude) {
            let h;
            let s;
            let l;
            if (altitude > 10000) {
                altitude = Math.ceil((altitude + 1) / 1000) * 1000;
            }
            else {
                altitude = Math.ceil((altitude + 1) / 500) * 500;
            }
            if (altitude === null) {
                h = 0;
                s = 0;
                l = 40;
            }
            else if (isNaN(altitude)) {
                h = 120;
                s = 100;
                l = 30;
            }
            else {
                s = 85;
                l = 50;
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
                        }
                        else {
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
            }
            else if (h >= 360) {
                h %= 360;
            }
            if (s < 5) {
                s = 5;
            }
            else if (s > 95) {
                s = 95;
            }
            if (l < 5) {
                l = 5;
            }
            else if (l > 95) {
                l = 95;
            }
            return [h, s, l];
        }
        static GetMarkerColor(ac) {
            if (ac.Squawk in this.specialSquawks) {
                return this.specialSquawks[ac.Squawk].MarkerColor;
            }
            if (ac.AirGround === READSB.eAirGround.invalid || ac.AirGround === READSB.eAirGround.uncertain) {
                return "hsl(200, 18%, 46%)";
            }
            if (ac.AirGround === READSB.eAirGround.ground) {
                return "hsl(16, 25%, 38%)";
            }
            let h;
            let s;
            let l;
            const colorArr = this.GetAltitudeColor(ac.Altitude);
            [h, s, l] = colorArr;
            if (ac.SeenPos > 15) {
                h += 0;
                s += -10;
                l += 30;
            }
            if (ac.PositionFromMlat) {
                h += 0;
                s += -10;
                l += -10;
            }
            if (h < 0) {
                h = (h % 360) + 360;
            }
            else if (h >= 360) {
                h %= 360;
            }
            if (s < 5) {
                s = 5;
            }
            else if (s > 95) {
                s = 95;
            }
            if (l < 5) {
                l = 5;
            }
            else if (l > 95) {
                l = 95;
            }
            return `hsl(${Math.round(h / 5) * 5},${Math.round(s / 5) * 5}%,${Math.round(l / 5) * 5}%)`;
        }
        static UpdateAircraftMarker(ac) {
            let marker = this.aircraftMarkers.get(ac.Icao);
            const fillColor = this.GetMarkerColor(ac);
            const strokeColor = "#000000";
            let refreshMarker = false;
            const scaleFactor = Math.max(0.2, Math.min(1.2, 0.2 * Math.pow(1.25, READSB.AppSettings.ZoomLevel)));
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
                if (marker.options.icon.options.typeDesignator !== ac.IcaoType) {
                    marker.remove();
                    refreshMarker = true;
                }
                else {
                    if (marker.options.icon.options.noRotate || false) {
                        rotation = 0;
                    }
                    if (ac.Position !== null && ac.SeenPos < 60) {
                        marker.SetLatLngScaleRotationColor(ac.Position, scaleFactor, rotation, fillColor, strokeColor);
                        marker.setTooltipContent(tip);
                    }
                }
            }
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
                READSB.LMap.AircraftPositions.addLayer(marker);
                this.aircraftMarkers.set(ac.Icao, marker);
            }
            marker.SelectAlertIdent((this.selectedAircraft === ac.Icao), ac.Alert, ac.SPIdent);
        }
        static ClearMarker(icao) {
            const marker = this.aircraftMarkers.get(icao);
            if (marker !== undefined) {
                if (READSB.LMap.AircraftPositions.hasLayer(marker)) {
                    READSB.LMap.AircraftPositions.removeLayer(marker);
                }
                this.aircraftMarkers.delete(icao);
            }
        }
        static UpdateTrace(icao, trace) {
            let layer = this.aircraftTraces.get(icao);
            if (layer === undefined) {
                layer = L.featureGroup();
            }
            const showTooltip = READSB.AppSettings.ShowTraceDetails;
            const du = READSB.AppSettings.DisplayUnits;
            let hsl;
            let color;
            let l;
            let dashArray;
            const segmentCount = layer.getLayers().length || 1;
            if (trace.length > 1 && segmentCount === trace.length) {
                const lastSegment = layer.getLayers()[segmentCount - 1];
                const latlngs = lastSegment.getLatLngs();
                const lastPos = latlngs.pop();
                lastPos.lat = trace[trace.length - 1][0];
                lastPos.lng = trace[trace.length - 1][1];
                latlngs.push(lastPos);
                lastSegment.setLatLngs(latlngs);
                lastSegment.redraw();
            }
            else {
                for (let i = segmentCount; i < trace.length; i++) {
                    hsl = this.GetAltitudeColor(trace[i][2]);
                    color = `hsl(${Math.round(hsl[0] / 5) * 5},${Math.round(hsl[1] / 5) * 5}%,${Math.round(hsl[2] / 5) * 5}%)`;
                    if (trace[i][3]) {
                        dashArray = "3 3";
                    }
                    else {
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
                        l.bindTooltip(`${t}\n${READSB.Format.AltitudeLong(trace[i][2], 0, du)}`, {
                            direction: "right",
                            interactive: false,
                            offset: L.point(0, -15),
                            opacity: 0.80,
                        });
                    }
                    l.addTo(layer);
                }
                if (segmentCount === 1) {
                    layer.addTo(READSB.LMap.AircraftTraces);
                }
            }
            this.aircraftTraces.set(icao, layer);
        }
        static ClearTrace(icao) {
            const layer = this.aircraftTraces.get(icao);
            if (layer !== undefined) {
                READSB.LMap.AircraftTraces.removeLayer(layer);
                layer.clearLayers();
                this.aircraftTraces.delete(icao);
            }
        }
    }
    Body.errorToastStatus = false;
    Body.rowTemplate = null;
    Body.followSelected = false;
    Body.selectedAircraft = null;
    Body.aircraftMarkers = new Map();
    Body.aircraftTraces = new Map();
    Body.specialSquawks = {
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
    Body.aircraftTraceCollector = null;
    READSB.Body = Body;
})(READSB || (READSB = {}));
//# sourceMappingURL=uiBody.js.map