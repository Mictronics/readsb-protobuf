"use strict";
var READSB;
(function (READSB) {
    class Aircraft {
        constructor(icao) {
            this.Icao = null;
            this.IcaoRange = null;
            this.Flight = null;
            this.Squawk = null;
            this.Selected = false;
            this.Category = null;
            this.Operator = null;
            this.Callsign = null;
            this.AddrType = null;
            this.Altitude = null;
            this.AltBaro = null;
            this.AltGeom = null;
            this.Speed = null;
            this.Gs = null;
            this.Ias = null;
            this.Tas = null;
            this.Track = null;
            this.TrackRate = null;
            this.MagHeading = null;
            this.TrueHeading = null;
            this.Mach = null;
            this.Roll = null;
            this.NavAltitude = null;
            this.NavHeading = null;
            this.NavModes = null;
            this.NavQnh = null;
            this.Rc = null;
            this.NacP = null;
            this.NacV = null;
            this.NicBaro = null;
            this.SilType = null;
            this.Sil = null;
            this.BaroRate = null;
            this.GeomRate = null;
            this.VertRate = null;
            this.Version = null;
            this.Position = null;
            this.PositionFromMlat = false;
            this.SiteDist = null;
            this.Alert = false;
            this.SPIdent = false;
            this.Messages = null;
            this.Rssi = null;
            this.HistorySize = 0;
            this.Seen = null;
            this.SeenPos = null;
            this.VisibleInList = true;
            this.Registration = null;
            this.IcaoType = null;
            this.TypeDescription = null;
            this.Species = null;
            this.Wtc = null;
            this.CivilMil = null;
            this.Interesting = null;
            this.SortPos = 0;
            this.SortValue = 0;
            this.LastMessageTime = null;
            this.DataSource = null;
            this.ExternalInfoLink = null;
            this.AirGround = READSB.eAirGround.invalid;
            this.Declination = null;
            this.WindDirection = null;
            this.WindSpeed = null;
            this.LastPositionTime = null;
            this.OperatorChecked = false;
            this.Icao = icao;
            this.IcaoRange = READSB.FindIcaoRange(this.Icao);
            this.Registration = READSB.Registration.FromHexId(this.Icao);
            READSB.DatabaseBackend.GetAircraftData(this.Icao, this.GetAircraftDataCallback.bind(this));
        }
        UpdateData(receiverTimestamp, data) {
            this.Messages = data.messages;
            this.Rssi = data.rssi;
            this.LastMessageTime = Math.trunc(data.seen / 1000);
            this.AltBaro = data.alt_baro;
            this.AltGeom = data.alt_geom;
            this.BaroRate = data.baro_rate;
            this.GeomRate = data.geom_rate;
            this.Gs = data.gs;
            this.Ias = data.ias;
            this.Mach = data.mach;
            this.MagHeading = data.mag_heading;
            this.NacP = data.nac_p;
            this.NacV = data.nac_v;
            this.NavHeading = data.nav_heading;
            this.NavQnh = data.nav_qnh;
            this.NicBaro = data.nic_baro;
            this.Rc = data.rc;
            this.Roll = data.roll;
            this.Sil = data.sil;
            this.Tas = data.tas;
            this.Track = data.track;
            this.TrackRate = data.track_rate;
            this.TrueHeading = data.true_heading;
            this.Version = data.version;
            this.Alert = !!data.alert;
            this.SPIdent = !!data.spi;
            this.SilType = READSB.eSilType[data.sil_type];
            this.AirGround = data.air_ground;
            this.Declination = data.declination;
            if (data.squawk !== null) {
                this.Squawk = data.squawk.toString(16).padStart(4, "0");
            }
            if (data.category !== null) {
                this.Category = data.category.toString(16).toUpperCase();
            }
            if (typeof data.nav_modes !== "undefined") {
                this.NavModes = [];
                if (data.nav_modes.althold) {
                    this.NavModes.push("althold");
                }
                if (data.nav_modes.approach) {
                    this.NavModes.push("approach");
                }
                if (data.nav_modes.autopilot) {
                    this.NavModes.push("autopilot");
                }
                if (data.nav_modes.lnav) {
                    this.NavModes.push("lnav");
                }
                if (data.nav_modes.tcas) {
                    this.NavModes.push("tcas");
                }
                if (data.nav_modes.vnav) {
                    this.NavModes.push("vnav");
                }
            }
            else {
                this.NavModes = null;
            }
            if (data.addr_type !== null) {
                this.AddrType = READSB.eAddrType[data.addr_type];
            }
            else {
                this.AddrType = "adsb_icao";
            }
            if (data.flight !== null) {
                this.Flight = data.flight;
            }
            if (data.lat !== null && data.lon !== null) {
                this.Position = { lat: data.lat, lng: data.lon };
                this.LastPositionTime = receiverTimestamp - data.seen_pos;
                this.PositionFromMlat = false;
                this.DataSource = this.AddrType;
                if (typeof data.valid_source !== "undefined") {
                    if (data.valid_source.lat === READSB.eDataSource.Mlat && data.valid_source.lon === READSB.eDataSource.Mlat) {
                        this.PositionFromMlat = true;
                        this.DataSource = "mlat";
                    }
                }
            }
            else {
                this.DataSource = "mode_s";
            }
            if (data.flight !== null && data.flight !== "") {
                this.Flight = data.flight;
                if (this.OperatorChecked === false && this.Callsign === null && this.Operator === null) {
                    READSB.DatabaseBackend.GetOperator(this.Flight, this.GetOperatorCallback.bind(this));
                }
                this.ExternalInfoLink = `<a target="_blank" href="https://flightaware.com/live/flight/${this.Flight.trim()}">${this.Flight.trim()}</a>`;
            }
            if (data.alt_baro !== null) {
                this.Altitude = data.alt_baro;
            }
            else if (data.alt_geom !== null) {
                this.Altitude = data.alt_geom;
            }
            else {
                this.Altitude = null;
            }
            if (data.nav_altitude_fms !== null) {
                this.NavAltitude = data.nav_altitude_fms;
            }
            else if (data.nav_altitude_mcp !== null) {
                this.NavAltitude = data.nav_altitude_mcp;
            }
            else {
                this.NavAltitude = null;
            }
            if (data.geom_rate !== null) {
                this.VertRate = data.geom_rate;
            }
            else if (data.baro_rate !== null) {
                this.VertRate = data.baro_rate;
            }
            else {
                this.VertRate = null;
            }
            if (data.gs !== null) {
                this.Speed = data.gs;
            }
            else if (data.tas !== null) {
                this.Speed = data.tas;
            }
            else if (data.ias !== null) {
                this.Speed = data.ias;
            }
            else {
                this.Speed = null;
            }
            if (data.valid_source.wind !== READSB.eDataSource.Invalid) {
                this.WindDirection = data.wind_direction;
                this.WindSpeed = data.wind_speed;
            }
            else {
                this.WindDirection = null;
                this.WindSpeed = null;
            }
        }
        UpdateVisibility(receiverTimestamp) {
            this.Seen = receiverTimestamp - this.LastMessageTime;
            this.SeenPos = (this.LastPositionTime === null ? null : receiverTimestamp - this.LastPositionTime);
            if (this.Seen > 58) {
                this.VisibleInList = false;
            }
            else {
                this.VisibleInList = true;
            }
            return this.VisibleInList;
        }
        GetOperatorCallback(result) {
            if (result !== undefined) {
                if ("radio" in result) {
                    this.Callsign = result.radio;
                }
                if ("name" in result) {
                    this.Operator = result.name;
                }
            }
            this.OperatorChecked = true;
        }
        GetAircraftDataCallback(result) {
            if (result !== undefined) {
                if ("reg" in result) {
                    this.Registration = result.reg;
                }
                if ("type" in result) {
                    this.IcaoType = result.type;
                    READSB.DatabaseBackend.GetType(this.IcaoType, this.GetAircraftTypeCallback.bind(this));
                }
                if ("flags" in result) {
                    switch (result.flags) {
                        default:
                        case "00":
                            this.CivilMil = false;
                            this.Interesting = false;
                            break;
                        case "01":
                            this.CivilMil = false;
                            this.Interesting = true;
                            break;
                        case "10":
                            this.CivilMil = true;
                            this.Interesting = false;
                            break;
                        case "11":
                            this.CivilMil = true;
                            this.Interesting = true;
                            break;
                    }
                }
                if ("desc" in result) {
                    if (result.desc !== null && result.desc.length > 0) {
                        this.TypeDescription = result.desc;
                    }
                }
            }
        }
        GetAircraftTypeCallback(result) {
            if (result !== undefined) {
                if ("wtc" in result) {
                    this.Wtc = result.wtc;
                }
                if ("species" in result) {
                    this.Species = result.desc;
                }
                if ("model" in result) {
                    this.TypeDescription = result.model;
                }
            }
        }
    }
    READSB.Aircraft = Aircraft;
})(READSB || (READSB = {}));
//# sourceMappingURL=aircraft.js.map