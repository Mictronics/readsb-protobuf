// Part of readsb, a Mode-S/ADSB/TIS message decoder.
//
// aircraft.ts: Class for single aircraft object.
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
    export class Aircraft implements IAircraft {
        public Icao: string = null;
        public IcaoRange: IIcaoRange = null;
        public Flight: string = null;
        public Squawk: string = null;
        public Selected: boolean = false;
        public Category: string = null;
        public Operator: string = null;
        public Callsign: string = null;
        public AddrType: string = null;
        public Altitude: number = null;
        public AltBaro: number = null;
        public AltGeom: number = null;
        public Speed: number = null;
        public Gs: number = null;
        public Ias: number = null;
        public Tas: number = null;
        public Track: number = null;
        public TrackRate: number = null;
        public MagHeading: number = null;
        public TrueHeading: number = null;
        public Mach: number = null;
        public Roll: number = null;
        public NavAltitude: number = null;
        public NavHeading: number = null;
        public NavModes: string[] = null;
        public NavQnh: number = null;
        public Rc: number = null;
        public NacP: number = null;
        public NacV: number = null;
        public NicBaro: number = null;
        public SilType: string = null;
        public Sil: number = null;
        public BaroRate: number = null;
        public GeomRate: number = null;
        public VertRate: number = null;
        public Version: number = null;
        public Position: any = null;
        public PositionFromMlat: boolean = false;
        public SiteDist: number = null;
        public Alert: boolean = false;
        public SPIdent: boolean = false;
        public Messages: number = null;
        public Rssi: number = null;
        public HistorySize: number = 0;
        public Seen: number = null;
        public SeenPos: number = null;
        public VisibleInList: boolean = true;
        public Registration: string = null;
        public IcaoType: string = null;
        public TypeDescription: string = null;
        public Species: string = null;
        public Wtc: string = null;
        public CivilMil: boolean = null;
        public Interesting: boolean = null;
        public SortPos: number = 0;
        public SortValue: number = 0;
        public LastMessageTime: number = null;
        public DataSource: string = null;
        public ExternalInfoLink: string = null;
        public AirGround: eAirGround = eAirGround.invalid;
        private LastPositionTime: number = null;
        private OperatorChecked: boolean = false;

        constructor(icao: string) {
            this.Icao = icao;
            this.IcaoRange = FindIcaoRange(this.Icao);
            this.Registration = Registration.FromHexId(this.Icao);
            // Request metadata
            DatabaseBackend.GetAircraftData(this.Icao, this.GetAircraftDataCallback.bind(this));
        }

        /**
         * Update this aircraft with data fetched from readsb backend service.
         * @param receiverTimestamp Timestamp when data was created.
         * @param data Aircraft data.
         */
        public UpdateData(receiverTimestamp: number, data: IAircraftMeta) {
            // Update all of our data
            this.Messages = data.messages;
            this.Rssi = data.rssi;
            this.LastMessageTime = Math.trunc(data.seen / 1000); // "seen" is in milliseconds!

            // Map simple fields from JSON to aircraft class properties
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
            this.SilType = eSilType[data.sil_type];
            this.AirGround = data.air_ground;

            if (data.squawk !== null) {
                this.Squawk = data.squawk.toString(16).padStart(4, "0");
            }

            if (data.category !== null) {
                this.Category = data.category.toString(16).toUpperCase();
            }

            if (typeof data.nav_modes !== "undefined") {
                this.NavModes = [];
                if (data.nav_modes.althold) { this.NavModes.push("althold"); }
                if (data.nav_modes.approach) { this.NavModes.push("approach"); }
                if (data.nav_modes.autopilot) { this.NavModes.push("autopilot"); }
                if (data.nav_modes.lnav) { this.NavModes.push("lnav"); }
                if (data.nav_modes.tcas) { this.NavModes.push("tcas"); }
                if (data.nav_modes.vnav) { this.NavModes.push("vnav"); }
            } else {
                this.NavModes = null;
            }

            // fields with more complex behaviour
            if (data.addr_type !== null) {
                this.AddrType = eAddrType[data.addr_type];
            } else {
                this.AddrType = "adsb_icao";
            }

            // don't expire callsigns
            if (data.flight !== null) {
                this.Flight = data.flight;
            }

            if (data.lat !== null && data.lon !== null) {
                this.Position = { lat: data.lat, lng: data.lon };
                this.LastPositionTime = receiverTimestamp - data.seen_pos;
                this.PositionFromMlat = false;
                this.DataSource = this.AddrType;
                if (typeof data.valid_source !== "undefined") {
                    if (data.valid_source.lat === eDataSource.Mlat && data.valid_source.lon === eDataSource.Mlat) {
                        this.PositionFromMlat = true;
                        this.DataSource = "mlat";
                    }
                }
            } else {
                this.DataSource = "mode_s";
            }

            if (data.flight !== null && data.flight !== "") {
                this.Flight = data.flight;
                if (this.OperatorChecked === false && this.Callsign === null && this.Operator === null) {
                    DatabaseBackend.GetOperator(this.Flight, this.GetOperatorCallback.bind(this));
                }
                this.ExternalInfoLink = `<a target="_blank" href="https://flightaware.com/live/flight/${this.Flight.trim()}">${this.Flight.trim()}</a>`;
            }

            // Pick an altitude
            if (data.alt_baro !== null) {
                this.Altitude = data.alt_baro;
            } else if (data.alt_geom !== null) {
                this.Altitude = data.alt_geom;
            } else {
                this.Altitude = null;
            }

            // Pick a selected altitude
            if (data.nav_altitude_fms !== null) {
                this.NavAltitude = data.nav_altitude_fms;
            } else if (data.nav_altitude_mcp !== null) {
                this.NavAltitude = data.nav_altitude_mcp;
            } else {
                this.NavAltitude = null;
            }

            // Pick vertical rate from either baro or geom rate
            // geometric rate is generally more reliable (smoothed etc)
            if (data.geom_rate !== null) {
                this.VertRate = data.geom_rate;
            } else if (data.baro_rate !== null) {
                this.VertRate = data.baro_rate;
            } else {
                this.VertRate = null;
            }

            // Pick a speed
            if (data.gs !== null) {
                this.Speed = data.gs;
            } else if (data.tas !== null) {
                this.Speed = data.tas;
            } else if (data.ias !== null) {
                this.Speed = data.ias;
            } else {
                this.Speed = null;
            }
        }

        /**
         * Update visibility status depending when aircraft was seen last time.
         * @param receiverTimestamp
         */
        public UpdateVisibility(receiverTimestamp: number): boolean {
            // recompute seen and seen_pos
            this.Seen = receiverTimestamp - this.LastMessageTime;
            this.SeenPos = (this.LastPositionTime === null ? null : receiverTimestamp - this.LastPositionTime);

            // If no packet in over 58 seconds, clear the aircraft.
            if (this.Seen > 58) {
                this.VisibleInList = false;
            } else {
                // Aircraft visible in list as long as recently updated
                this.VisibleInList = true;
            }
            return this.VisibleInList;
        }

        /**
         * Update operator details from database.
         * @param result Result from indexedDB query.
         */
        private GetOperatorCallback(result: any) {
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

        /**
         * Update aircraft details from database.
         * @param result Result from indexedDB query.
         */
        private GetAircraftDataCallback(result: any) {
            if (result !== undefined) {
                if ("reg" in result) {
                    this.Registration = result.reg;
                }

                if ("type" in result) {
                    this.IcaoType = result.type;
                    DatabaseBackend.GetType(this.IcaoType, this.GetAircraftTypeCallback.bind(this));
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
                    this.TypeDescription = result.desc;
                }
            }
        }

        /**
         * Update aircraft type details from database.
         * @param result Result from indexedDB query.
         */
        private GetAircraftTypeCallback(result: any) {
            if (result !== undefined) {
                if ("wtc" in result) {
                    this.Wtc = result.wtc;
                }
                if ("desc" in result) {
                    this.Species = result.desc;
                }
            }
        }
    }
}
