"use strict";
var READSB;
(function (READSB) {
    READSB.AircraftMeta = {
        NavModes: {
            read(pbf, end) {
                return pbf.readFields(this._readField, {
                    althold: false,
                    approach: false,
                    autopilot: false,
                    lnav: false,
                    tcas: false,
                    vnav: false,
                }, end);
            },
            _readField(tag, obj, pbf) {
                if (tag === 1) {
                    obj.autopilot = pbf.readBoolean();
                }
                else if (tag === 2) {
                    obj.vnav = pbf.readBoolean();
                }
                else if (tag === 3) {
                    obj.althold = pbf.readBoolean();
                }
                else if (tag === 4) {
                    obj.approach = pbf.readBoolean();
                }
                else if (tag === 5) {
                    obj.lnav = pbf.readBoolean();
                }
                else if (tag === 6) {
                    obj.tcas = pbf.readBoolean();
                }
            },
            write(obj, pbf) {
                if (obj.autopilot) {
                    pbf.writeBooleanField(1, obj.autopilot);
                }
                if (obj.vnav) {
                    pbf.writeBooleanField(2, obj.vnav);
                }
                if (obj.althold) {
                    pbf.writeBooleanField(3, obj.althold);
                }
                if (obj.approach) {
                    pbf.writeBooleanField(4, obj.approach);
                }
                if (obj.lnav) {
                    pbf.writeBooleanField(5, obj.lnav);
                }
                if (obj.tcas) {
                    pbf.writeBooleanField(6, obj.tcas);
                }
            },
        },
        ValidSource: {
            read(pbf, end) {
                return pbf.readFields(this._readField, {
                    alt_geom: READSB.eDataSource.Invalid,
                    altitude: READSB.eDataSource.Invalid,
                    baro_rate: READSB.eDataSource.Invalid,
                    callsign: READSB.eDataSource.Invalid,
                    emergency: READSB.eDataSource.Invalid,
                    geom_rate: READSB.eDataSource.Invalid,
                    gs: READSB.eDataSource.Invalid,
                    gva: READSB.eDataSource.Invalid,
                    ias: READSB.eDataSource.Invalid,
                    lat: READSB.eDataSource.Invalid,
                    lon: READSB.eDataSource.Invalid,
                    mach: READSB.eDataSource.Invalid,
                    mag_heading: READSB.eDataSource.Invalid,
                    nac_p: READSB.eDataSource.Invalid,
                    nac_v: READSB.eDataSource.Invalid,
                    nav_altitude_fms: READSB.eDataSource.Invalid,
                    nav_altitude_mcp: READSB.eDataSource.Invalid,
                    nav_heading: READSB.eDataSource.Invalid,
                    nav_modes: READSB.eDataSource.Invalid,
                    nav_qnh: READSB.eDataSource.Invalid,
                    nic: READSB.eDataSource.Invalid,
                    nic_baro: READSB.eDataSource.Invalid,
                    rc: READSB.eDataSource.Invalid,
                    roll: READSB.eDataSource.Invalid,
                    sda: READSB.eDataSource.Invalid,
                    sil: READSB.eDataSource.Invalid,
                    sil_type: READSB.eDataSource.Invalid,
                    squawk: READSB.eDataSource.Invalid,
                    tas: READSB.eDataSource.Invalid,
                    track: READSB.eDataSource.Invalid,
                    track_rate: READSB.eDataSource.Invalid,
                    true_heading: READSB.eDataSource.Invalid,
                    wind: READSB.eDataSource.Invalid,
                }, end);
            },
            _readField(tag, obj, pbf) {
                if (tag === 100) {
                    obj.callsign = pbf.readVarint();
                }
                else if (tag === 101) {
                    obj.altitude = pbf.readVarint();
                }
                else if (tag === 102) {
                    obj.alt_geom = pbf.readVarint();
                }
                else if (tag === 103) {
                    obj.gs = pbf.readVarint();
                }
                else if (tag === 104) {
                    obj.ias = pbf.readVarint();
                }
                else if (tag === 105) {
                    obj.tas = pbf.readVarint();
                }
                else if (tag === 106) {
                    obj.mach = pbf.readVarint();
                }
                else if (tag === 107) {
                    obj.track = pbf.readVarint();
                }
                else if (tag === 108) {
                    obj.track_rate = pbf.readVarint();
                }
                else if (tag === 109) {
                    obj.roll = pbf.readVarint();
                }
                else if (tag === 110) {
                    obj.mag_heading = pbf.readVarint();
                }
                else if (tag === 111) {
                    obj.true_heading = pbf.readVarint();
                }
                else if (tag === 112) {
                    obj.baro_rate = pbf.readVarint();
                }
                else if (tag === 113) {
                    obj.geom_rate = pbf.readVarint();
                }
                else if (tag === 114) {
                    obj.squawk = pbf.readVarint();
                }
                else if (tag === 115) {
                    obj.emergency = pbf.readVarint();
                }
                else if (tag === 116) {
                    obj.nav_qnh = pbf.readVarint();
                }
                else if (tag === 117) {
                    obj.nav_altitude_mcp = pbf.readVarint();
                }
                else if (tag === 118) {
                    obj.nav_altitude_fms = pbf.readVarint();
                }
                else if (tag === 119) {
                    obj.nav_heading = pbf.readVarint();
                }
                else if (tag === 120) {
                    obj.nav_modes = pbf.readVarint();
                }
                else if (tag === 121) {
                    obj.lat = pbf.readVarint();
                }
                else if (tag === 122) {
                    obj.lon = pbf.readVarint();
                }
                else if (tag === 123) {
                    obj.nic = pbf.readVarint();
                }
                else if (tag === 124) {
                    obj.rc = pbf.readVarint();
                }
                else if (tag === 125) {
                    obj.nic_baro = pbf.readVarint();
                }
                else if (tag === 126) {
                    obj.nac_p = pbf.readVarint();
                }
                else if (tag === 127) {
                    obj.nac_v = pbf.readVarint();
                }
                else if (tag === 128) {
                    obj.sil = pbf.readVarint();
                }
                else if (tag === 129) {
                    obj.sil_type = pbf.readVarint();
                }
                else if (tag === 130) {
                    obj.gva = pbf.readVarint();
                }
                else if (tag === 131) {
                    obj.sda = pbf.readVarint();
                }
                else if (tag === 132) {
                    obj.wind = pbf.readVarint();
                }
            },
            write(obj, pbf) {
                if (obj.callsign) {
                    pbf.writeVarintField(100, obj.callsign);
                }
                if (obj.altitude) {
                    pbf.writeVarintField(101, obj.altitude);
                }
                if (obj.alt_geom) {
                    pbf.writeVarintField(102, obj.alt_geom);
                }
                if (obj.gs) {
                    pbf.writeVarintField(103, obj.gs);
                }
                if (obj.ias) {
                    pbf.writeVarintField(104, obj.ias);
                }
                if (obj.tas) {
                    pbf.writeVarintField(105, obj.tas);
                }
                if (obj.mach) {
                    pbf.writeVarintField(106, obj.mach);
                }
                if (obj.track) {
                    pbf.writeVarintField(107, obj.track);
                }
                if (obj.track_rate) {
                    pbf.writeVarintField(108, obj.track_rate);
                }
                if (obj.roll) {
                    pbf.writeVarintField(109, obj.roll);
                }
                if (obj.mag_heading) {
                    pbf.writeVarintField(110, obj.mag_heading);
                }
                if (obj.true_heading) {
                    pbf.writeVarintField(111, obj.true_heading);
                }
                if (obj.baro_rate) {
                    pbf.writeVarintField(112, obj.baro_rate);
                }
                if (obj.geom_rate) {
                    pbf.writeVarintField(113, obj.geom_rate);
                }
                if (obj.squawk) {
                    pbf.writeVarintField(114, obj.squawk);
                }
                if (obj.emergency) {
                    pbf.writeVarintField(115, obj.emergency);
                }
                if (obj.nav_qnh) {
                    pbf.writeVarintField(116, obj.nav_qnh);
                }
                if (obj.nav_altitude_mcp) {
                    pbf.writeVarintField(117, obj.nav_altitude_mcp);
                }
                if (obj.nav_altitude_fms) {
                    pbf.writeVarintField(118, obj.nav_altitude_fms);
                }
                if (obj.nav_heading) {
                    pbf.writeVarintField(119, obj.nav_heading);
                }
                if (obj.nav_modes) {
                    pbf.writeVarintField(120, obj.nav_modes);
                }
                if (obj.lat) {
                    pbf.writeVarintField(121, obj.lat);
                }
                if (obj.lon) {
                    pbf.writeVarintField(122, obj.lon);
                }
                if (obj.nic) {
                    pbf.writeVarintField(123, obj.nic);
                }
                if (obj.rc) {
                    pbf.writeVarintField(124, obj.rc);
                }
                if (obj.nic_baro) {
                    pbf.writeVarintField(125, obj.nic_baro);
                }
                if (obj.nac_p) {
                    pbf.writeVarintField(126, obj.nac_p);
                }
                if (obj.nac_v) {
                    pbf.writeVarintField(127, obj.nac_v);
                }
                if (obj.sil) {
                    pbf.writeVarintField(128, obj.sil);
                }
                if (obj.sil_type) {
                    pbf.writeVarintField(129, obj.sil_type);
                }
                if (obj.gva) {
                    pbf.writeVarintField(130, obj.gva);
                }
                if (obj.sda) {
                    pbf.writeVarintField(131, obj.sda);
                }
                if (obj.wind) {
                    pbf.writeVarintField(132, obj.wind);
                }
            },
        },
        read(pbf, end) {
            return pbf.readFields(this._readField, {
                addr: null,
                addr_type: null,
                air_ground: null,
                alert: false,
                alt_baro: null,
                alt_geom: null,
                baro_rate: null,
                category: null,
                declination: null,
                distance: null,
                emergency: null,
                flight: null,
                geom_rate: null,
                gs: null,
                gva: null,
                ias: null,
                lat: null,
                lon: null,
                mach: null,
                mag_heading: null,
                messages: null,
                mlat: undefined,
                nac_p: null,
                nac_v: null,
                nav_altitude_fms: null,
                nav_altitude_mcp: null,
                nav_heading: null,
                nav_modes: undefined,
                nav_qnh: null,
                nic: null,
                nic_baro: null,
                rc: null,
                roll: null,
                rssi: null,
                sda: null,
                seen: null,
                seen_pos: null,
                sil: null,
                sil_type: null,
                spi: false,
                squawk: null,
                tas: null,
                tisb: undefined,
                track: null,
                track_rate: null,
                true_heading: null,
                version: null,
                wind_direction: null,
                wind_speed: null,
            }, end);
        },
        _readField(tag, obj, pbf) {
            if (tag === 1) {
                obj.addr = pbf.readVarint();
            }
            else if (tag === 2) {
                obj.flight = pbf.readString();
            }
            else if (tag === 3) {
                obj.squawk = pbf.readVarint();
            }
            else if (tag === 4) {
                obj.category = pbf.readVarint();
            }
            else if (tag === 5) {
                obj.alt_baro = pbf.readVarint(true);
            }
            else if (tag === 6) {
                obj.mag_heading = pbf.readVarint(true);
            }
            else if (tag === 7) {
                obj.ias = pbf.readVarint();
            }
            else if (tag === 8) {
                obj.lat = pbf.readDouble();
            }
            else if (tag === 9) {
                obj.lon = pbf.readDouble();
            }
            else if (tag === 10) {
                obj.messages = pbf.readVarint();
            }
            else if (tag === 11) {
                obj.seen = pbf.readVarint();
            }
            else if (tag === 12) {
                obj.rssi = pbf.readFloat();
            }
            else if (tag === 13) {
                obj.distance = pbf.readVarint();
            }
            else if (tag === 15) {
                obj.air_ground = pbf.readVarint();
            }
            else if (tag === 20) {
                obj.alt_geom = pbf.readVarint(true);
            }
            else if (tag === 21) {
                obj.baro_rate = pbf.readVarint(true);
            }
            else if (tag === 22) {
                obj.geom_rate = pbf.readVarint(true);
            }
            else if (tag === 23) {
                obj.gs = pbf.readVarint();
            }
            else if (tag === 24) {
                obj.tas = pbf.readVarint();
            }
            else if (tag === 25) {
                obj.mach = pbf.readFloat();
            }
            else if (tag === 26) {
                obj.true_heading = pbf.readVarint(true);
            }
            else if (tag === 27) {
                obj.track = pbf.readVarint(true);
            }
            else if (tag === 28) {
                obj.track_rate = pbf.readFloat();
            }
            else if (tag === 29) {
                obj.roll = pbf.readFloat();
            }
            else if (tag === 30) {
                obj.nav_qnh = pbf.readFloat();
            }
            else if (tag === 31) {
                obj.nav_altitude_mcp = pbf.readVarint(true);
            }
            else if (tag === 32) {
                obj.nav_altitude_fms = pbf.readVarint(true);
            }
            else if (tag === 33) {
                obj.nav_heading = pbf.readVarint(true);
            }
            else if (tag === 34) {
                obj.nic = pbf.readVarint();
            }
            else if (tag === 35) {
                obj.rc = pbf.readVarint();
            }
            else if (tag === 36) {
                obj.version = pbf.readVarint(true);
            }
            else if (tag === 37) {
                obj.nic_baro = pbf.readVarint();
            }
            else if (tag === 38) {
                obj.nac_p = pbf.readVarint();
            }
            else if (tag === 39) {
                obj.nac_v = pbf.readVarint();
            }
            else if (tag === 40) {
                obj.sil = pbf.readVarint();
            }
            else if (tag === 41) {
                obj.seen_pos = pbf.readVarint();
            }
            else if (tag === 42) {
                obj.alert = pbf.readBoolean();
            }
            else if (tag === 43) {
                obj.spi = pbf.readBoolean();
            }
            else if (tag === 44) {
                obj.gva = pbf.readVarint();
            }
            else if (tag === 45) {
                obj.sda = pbf.readVarint();
            }
            else if (tag === 46) {
                obj.declination = pbf.readDouble();
            }
            else if (tag === 47) {
                obj.wind_speed = pbf.readVarint();
            }
            else if (tag === 48) {
                obj.wind_direction = pbf.readVarint();
            }
            else if (tag === 100) {
                obj.addr_type = pbf.readVarint();
            }
            else if (tag === 101) {
                obj.emergency = pbf.readVarint();
            }
            else if (tag === 102) {
                obj.sil_type = pbf.readVarint();
            }
            else if (tag === 150) {
                obj.nav_modes = READSB.AircraftMeta.NavModes.read(pbf, pbf.readVarint() + pbf.pos);
            }
            else if (tag === 151) {
                obj.valid_source = READSB.AircraftMeta.ValidSource.read(pbf, pbf.readVarint() + pbf.pos);
            }
        },
        write(obj, pbf) {
            if (obj.addr) {
                pbf.writeVarintField(1, obj.addr);
            }
            if (obj.flight) {
                pbf.writeStringField(2, obj.flight);
            }
            if (obj.squawk) {
                pbf.writeVarintField(3, obj.squawk);
            }
            if (obj.category) {
                pbf.writeVarintField(4, obj.category);
            }
            if (obj.alt_baro) {
                pbf.writeVarintField(5, obj.alt_baro);
            }
            if (obj.mag_heading) {
                pbf.writeVarintField(6, obj.mag_heading);
            }
            if (obj.ias) {
                pbf.writeVarintField(7, obj.ias);
            }
            if (obj.lat) {
                pbf.writeDoubleField(8, obj.lat);
            }
            if (obj.lon) {
                pbf.writeDoubleField(9, obj.lon);
            }
            if (obj.messages) {
                pbf.writeVarintField(10, obj.messages);
            }
            if (obj.seen) {
                pbf.writeVarintField(11, obj.seen);
            }
            if (obj.rssi) {
                pbf.writeFloatField(12, obj.rssi);
            }
            if (obj.distance) {
                pbf.writeVarintField(13, obj.distance);
            }
            if (obj.air_ground) {
                pbf.writeVarintField(15, obj.air_ground);
            }
            if (obj.alt_geom) {
                pbf.writeVarintField(20, obj.alt_geom);
            }
            if (obj.baro_rate) {
                pbf.writeVarintField(21, obj.baro_rate);
            }
            if (obj.geom_rate) {
                pbf.writeVarintField(22, obj.geom_rate);
            }
            if (obj.gs) {
                pbf.writeVarintField(23, obj.gs);
            }
            if (obj.tas) {
                pbf.writeVarintField(24, obj.tas);
            }
            if (obj.mach) {
                pbf.writeFloatField(25, obj.mach);
            }
            if (obj.true_heading) {
                pbf.writeVarintField(26, obj.true_heading);
            }
            if (obj.track) {
                pbf.writeVarintField(27, obj.track);
            }
            if (obj.track_rate) {
                pbf.writeFloatField(28, obj.track_rate);
            }
            if (obj.roll) {
                pbf.writeFloatField(29, obj.roll);
            }
            if (obj.nav_qnh) {
                pbf.writeFloatField(30, obj.nav_qnh);
            }
            if (obj.nav_altitude_mcp) {
                pbf.writeVarintField(31, obj.nav_altitude_mcp);
            }
            if (obj.nav_altitude_fms) {
                pbf.writeVarintField(32, obj.nav_altitude_fms);
            }
            if (obj.nav_heading) {
                pbf.writeVarintField(33, obj.nav_heading);
            }
            if (obj.nic) {
                pbf.writeVarintField(34, obj.nic);
            }
            if (obj.rc) {
                pbf.writeVarintField(35, obj.rc);
            }
            if (obj.version) {
                pbf.writeVarintField(36, obj.version);
            }
            if (obj.nic_baro) {
                pbf.writeVarintField(37, obj.nic_baro);
            }
            if (obj.nac_p) {
                pbf.writeVarintField(38, obj.nac_p);
            }
            if (obj.nac_v) {
                pbf.writeVarintField(39, obj.nac_v);
            }
            if (obj.sil) {
                pbf.writeVarintField(40, obj.sil);
            }
            if (obj.seen_pos) {
                pbf.writeVarintField(41, obj.seen_pos);
            }
            if (obj.alert) {
                pbf.writeBooleanField(42, obj.alert);
            }
            if (obj.spi) {
                pbf.writeBooleanField(43, obj.spi);
            }
            if (obj.gva) {
                pbf.writeVarintField(44, obj.gva);
            }
            if (obj.sda) {
                pbf.writeVarintField(45, obj.sda);
            }
            if (obj.declination) {
                pbf.writeDoubleField(46, obj.declination);
            }
            if (obj.wind_speed) {
                pbf.writeVarintField(47, obj.wind_speed);
            }
            if (obj.wind_direction) {
                pbf.writeVarintField(48, obj.wind_direction);
            }
            if (obj.addr_type) {
                pbf.writeVarintField(100, obj.addr_type);
            }
            if (obj.emergency) {
                pbf.writeVarintField(101, obj.emergency);
            }
            if (obj.sil_type) {
                pbf.writeVarintField(102, obj.sil_type);
            }
            if (obj.nav_modes) {
                pbf.writeMessage(150, READSB.AircraftMeta.NavModes.write, obj.nav_modes);
            }
            if (obj.valid_source) {
                pbf.writeMessage(151, READSB.AircraftMeta.ValidSource.write, obj.valid_source);
            }
        },
    };
    READSB.AircraftHistory = {
        read(pbf, end) {
            return pbf.readFields(this._readField, {
                addr: null,
                alt_baro: null,
                lat: null,
                lon: null,
            }, end);
        },
        _readField(tag, obj, pbf) {
            if (tag === 1) {
                obj.addr = pbf.readVarint();
            }
            else if (tag === 5) {
                obj.alt_baro = pbf.readVarint(true);
            }
            else if (tag === 8) {
                obj.lat = pbf.readDouble();
            }
            else if (tag === 9) {
                obj.lon = pbf.readDouble();
            }
        },
        write(obj, pbf) {
            if (obj.addr) {
                pbf.writeVarintField(1, obj.addr);
            }
            if (obj.alt_baro) {
                pbf.writeVarintField(5, obj.alt_baro);
            }
            if (obj.lat) {
                pbf.writeDoubleField(8, obj.lat);
            }
            if (obj.lon) {
                pbf.writeDoubleField(9, obj.lon);
            }
        },
    };
    READSB.AircraftsUpdate = {
        read(pbf, end) {
            return pbf.readFields(this._readField, {
                now: 0,
                messages: 0,
                aircraft: [],
                history: [],
            }, end);
        },
        _readField(tag, obj, pbf) {
            if (tag === 1) {
                obj.now = pbf.readVarint();
            }
            else if (tag === 2) {
                obj.messages = pbf.readVarint();
            }
            else if (tag === 14) {
                obj.history.push(READSB.AircraftHistory.read(pbf, pbf.readVarint() + pbf.pos));
            }
            else if (tag === 15) {
                obj.aircraft.push(READSB.AircraftMeta.read(pbf, pbf.readVarint() + pbf.pos));
            }
        },
        write(obj, pbf) {
            if (obj.now) {
                pbf.writeVarintField(1, obj.now);
            }
            if (obj.messages) {
                pbf.writeVarintField(2, obj.messages);
            }
            if (obj.history) {
                for (const ac of obj.history) {
                    pbf.writeMessage(14, READSB.AircraftHistory.write, ac);
                }
            }
            if (obj.aircraft) {
                for (const ac of obj.aircraft) {
                    pbf.writeMessage(15, READSB.AircraftMeta.write, ac);
                }
            }
        },
    };
    READSB.Receiver = {
        read(pbf, end) {
            return pbf.readFields(this._readField, {
                version: null,
                refresh: null,
                latitude: null,
                longitude: null,
                altitude: null,
                antenna_serial: null,
                antenna_flags: null,
                antenna_gps_sats: null,
                antenna_gps_hdop: null,
                antenna_reserved: null,
                history: null,
            }, end);
        },
        _readField(tag, obj, pbf) {
            if (tag === 1) {
                obj.version = pbf.readString();
            }
            else if (tag === 2) {
                obj.refresh = pbf.readFloat();
            }
            else if (tag === 3) {
                obj.latitude = pbf.readDouble();
            }
            else if (tag === 4) {
                obj.longitude = pbf.readDouble();
            }
            else if (tag === 5) {
                obj.altitude = pbf.readVarint();
            }
            else if (tag === 6) {
                obj.antenna_serial = pbf.readVarint();
            }
            else if (tag === 7) {
                obj.antenna_flags = pbf.readVarint();
            }
            else if (tag === 8) {
                obj.antenna_gps_sats = pbf.readVarint();
            }
            else if (tag === 9) {
                obj.antenna_gps_hdop = pbf.readVarint();
            }
            else if (tag === 14) {
                obj.antenna_reserved = pbf.readVarint();
            }
            else if (tag === 15) {
                obj.history = pbf.readVarint();
            }
        },
        write(obj, pbf) {
            if (obj.version) {
                pbf.writeStringField(1, obj.version);
            }
            if (obj.refresh) {
                pbf.writeFloatField(2, obj.refresh);
            }
            if (obj.latitude) {
                pbf.writeDoubleField(3, obj.latitude);
            }
            if (obj.longitude) {
                pbf.writeDoubleField(4, obj.longitude);
            }
            if (obj.altitude) {
                pbf.writeVarintField(5, obj.altitude);
            }
            if (obj.antenna_serial) {
                pbf.writeVarintField(6, obj.antenna_flags);
            }
            if (obj.antenna_flags) {
                pbf.writeVarintField(7, obj.antenna_flags);
            }
            if (obj.antenna_gps_sats) {
                pbf.writeVarintField(8, obj.antenna_gps_sats);
            }
            if (obj.antenna_gps_hdop) {
                pbf.writeVarintField(9, obj.antenna_gps_hdop);
            }
            if (obj.antenna_reserved) {
                pbf.writeVarintField(14, obj.antenna_reserved);
            }
            if (obj.history) {
                pbf.writeVarintField(15, obj.history);
            }
        },
    };
    READSB.StatisticEntry = {
        read(pbf, end) {
            return pbf.readFields(this._readField, {
                start: 0,
                stop: 0,
                messages: 0,
                max_distance_in_metres: 0,
                max_distance_in_nautical_miles: 0,
                altitude_suppressed: 0,
                tracks_all: 0,
                tracks_single_message: 0,
                cpu_demod: 0,
                cpu_reader: 0,
                cpu_background: 0,
                cpr_surface: 0,
                cpr_airborne: 0,
                cpr_global_ok: 0,
                cpr_global_bad: 0,
                cpr_global_range: 0,
                cpr_global_speed: 0,
                cpr_global_skipped: 0,
                cpr_local_ok: 0,
                cpr_local_aircraft_relative: 0,
                cpr_local_receiver_relative: 0,
                cpr_local_skipped: 0,
                cpr_local_range: 0,
                cpr_local_speed: 0,
                cpr_filtered: 0,
                remote_accepted: 0,
                remote_modeac: 0,
                remote_modes: 0,
                remote_bad: 0,
                remote_unknown_icao: 0,
                local_accepted: 0,
                local_samples_processed: 0,
                local_samples_dropped: 0,
                local_modeac: 0,
                local_modes: 0,
                local_bad: 0,
                local_unknown_icao: 0,
                local_strong_signals: 0,
                local_signal: 0,
                local_noise: 0,
                local_peak_signal: 0,
            }, end);
        },
        _readField(tag, obj, pbf) {
            if (tag === 1) {
                obj.start = pbf.readVarint();
            }
            else if (tag === 2) {
                obj.stop = pbf.readVarint();
            }
            else if (tag === 3) {
                obj.messages = pbf.readVarint();
            }
            else if (tag === 4) {
                obj.max_distance_in_metres = pbf.readVarint();
            }
            else if (tag === 5) {
                obj.max_distance_in_nautical_miles = pbf.readVarint();
            }
            else if (tag === 6) {
                obj.altitude_suppressed = pbf.readVarint();
            }
            else if (tag === 7) {
                obj.tracks_all = pbf.readVarint();
            }
            else if (tag === 8) {
                obj.tracks_single_message = pbf.readVarint();
            }
            else if (tag === 20) {
                obj.cpu_demod = pbf.readVarint();
            }
            else if (tag === 21) {
                obj.cpu_reader = pbf.readVarint();
            }
            else if (tag === 22) {
                obj.cpu_background = pbf.readVarint();
            }
            else if (tag === 40) {
                obj.cpr_surface = pbf.readVarint();
            }
            else if (tag === 41) {
                obj.cpr_airborne = pbf.readVarint();
            }
            else if (tag === 42) {
                obj.cpr_global_ok = pbf.readVarint();
            }
            else if (tag === 43) {
                obj.cpr_global_bad = pbf.readVarint();
            }
            else if (tag === 44) {
                obj.cpr_global_range = pbf.readVarint();
            }
            else if (tag === 45) {
                obj.cpr_global_speed = pbf.readVarint();
            }
            else if (tag === 46) {
                obj.cpr_global_skipped = pbf.readVarint();
            }
            else if (tag === 47) {
                obj.cpr_local_ok = pbf.readVarint();
            }
            else if (tag === 48) {
                obj.cpr_local_aircraft_relative = pbf.readVarint();
            }
            else if (tag === 49) {
                obj.cpr_local_receiver_relative = pbf.readVarint();
            }
            else if (tag === 50) {
                obj.cpr_local_skipped = pbf.readVarint();
            }
            else if (tag === 51) {
                obj.cpr_local_range = pbf.readVarint();
            }
            else if (tag === 52) {
                obj.cpr_local_speed = pbf.readVarint();
            }
            else if (tag === 53) {
                obj.cpr_filtered = pbf.readVarint();
            }
            else if (tag === 70) {
                obj.remote_modeac = pbf.readVarint();
            }
            else if (tag === 71) {
                obj.remote_modes = pbf.readVarint();
            }
            else if (tag === 72) {
                obj.remote_bad = pbf.readVarint();
            }
            else if (tag === 73) {
                obj.remote_unknown_icao = pbf.readVarint();
            }
            else if (tag === 74) {
                obj.remote_accepted = pbf.readVarint();
            }
            else if (tag === 90) {
                obj.local_samples_processed = pbf.readVarint();
            }
            else if (tag === 91) {
                obj.local_samples_dropped = pbf.readVarint();
            }
            else if (tag === 92) {
                obj.local_modeac = pbf.readVarint();
            }
            else if (tag === 93) {
                obj.local_modes = pbf.readVarint();
            }
            else if (tag === 94) {
                obj.local_bad = pbf.readVarint();
            }
            else if (tag === 95) {
                obj.local_unknown_icao = pbf.readVarint();
            }
            else if (tag === 96) {
                obj.local_strong_signals = pbf.readVarint();
            }
            else if (tag === 97) {
                obj.local_signal = pbf.readFloat();
            }
            else if (tag === 98) {
                obj.local_noise = pbf.readFloat();
            }
            else if (tag === 99) {
                obj.local_peak_signal = pbf.readFloat();
            }
            else if (tag === 100) {
                obj.local_accepted = pbf.readVarint();
            }
        },
        write(obj, pbf) {
            if (obj.start) {
                pbf.writeVarintField(1, obj.start);
            }
            if (obj.stop) {
                pbf.writeVarintField(2, obj.stop);
            }
            if (obj.messages) {
                pbf.writeVarintField(3, obj.messages);
            }
            if (obj.max_distance_in_metres) {
                pbf.writeVarintField(4, obj.max_distance_in_metres);
            }
            if (obj.max_distance_in_nautical_miles) {
                pbf.writeVarintField(5, obj.max_distance_in_nautical_miles);
            }
            if (obj.altitude_suppressed) {
                pbf.writeVarintField(6, obj.altitude_suppressed);
            }
            if (obj.tracks_all) {
                pbf.writeVarintField(7, obj.tracks_all);
            }
            if (obj.tracks_single_message) {
                pbf.writeVarintField(8, obj.tracks_single_message);
            }
            if (obj.cpu_demod) {
                pbf.writeVarintField(20, obj.cpu_demod);
            }
            if (obj.cpu_reader) {
                pbf.writeVarintField(21, obj.cpu_reader);
            }
            if (obj.cpu_background) {
                pbf.writeVarintField(22, obj.cpu_background);
            }
            if (obj.cpr_surface) {
                pbf.writeVarintField(40, obj.cpr_surface);
            }
            if (obj.cpr_airborne) {
                pbf.writeVarintField(41, obj.cpr_airborne);
            }
            if (obj.cpr_global_ok) {
                pbf.writeVarintField(42, obj.cpr_global_ok);
            }
            if (obj.cpr_global_bad) {
                pbf.writeVarintField(43, obj.cpr_global_bad);
            }
            if (obj.cpr_global_range) {
                pbf.writeVarintField(44, obj.cpr_global_range);
            }
            if (obj.cpr_global_speed) {
                pbf.writeVarintField(45, obj.cpr_global_speed);
            }
            if (obj.cpr_global_skipped) {
                pbf.writeVarintField(46, obj.cpr_global_skipped);
            }
            if (obj.cpr_local_ok) {
                pbf.writeVarintField(47, obj.cpr_local_ok);
            }
            if (obj.cpr_local_aircraft_relative) {
                pbf.writeVarintField(48, obj.cpr_local_aircraft_relative);
            }
            if (obj.cpr_local_receiver_relative) {
                pbf.writeVarintField(49, obj.cpr_local_receiver_relative);
            }
            if (obj.cpr_local_skipped) {
                pbf.writeVarintField(50, obj.cpr_local_skipped);
            }
            if (obj.cpr_local_range) {
                pbf.writeVarintField(51, obj.cpr_local_range);
            }
            if (obj.cpr_local_speed) {
                pbf.writeVarintField(52, obj.cpr_local_speed);
            }
            if (obj.cpr_filtered) {
                pbf.writeVarintField(53, obj.cpr_filtered);
            }
            if (obj.remote_modeac) {
                pbf.writeVarintField(70, obj.remote_modeac);
            }
            if (obj.remote_modes) {
                pbf.writeVarintField(71, obj.remote_modes);
            }
            if (obj.remote_bad) {
                pbf.writeVarintField(72, obj.remote_bad);
            }
            if (obj.remote_unknown_icao) {
                pbf.writeVarintField(73, obj.remote_unknown_icao);
            }
            if (obj.remote_accepted) {
                pbf.writeVarintField(74, obj.remote_accepted);
            }
            if (obj.local_samples_processed) {
                pbf.writeVarintField(90, obj.local_samples_processed);
            }
            if (obj.local_samples_dropped) {
                pbf.writeVarintField(91, obj.local_samples_dropped);
            }
            if (obj.local_modeac) {
                pbf.writeVarintField(92, obj.local_modeac);
            }
            if (obj.local_modes) {
                pbf.writeVarintField(93, obj.local_modes);
            }
            if (obj.local_bad) {
                pbf.writeVarintField(94, obj.local_bad);
            }
            if (obj.local_unknown_icao) {
                pbf.writeVarintField(95, obj.local_unknown_icao);
            }
            if (obj.local_strong_signals) {
                pbf.writeVarintField(96, obj.local_strong_signals);
            }
            if (obj.local_signal) {
                pbf.writeFloatField(97, obj.local_signal);
            }
            if (obj.local_noise) {
                pbf.writeFloatField(98, obj.local_noise);
            }
            if (obj.local_peak_signal) {
                pbf.writeFloatField(99, obj.local_peak_signal);
            }
            if (obj.local_accepted) {
                pbf.writeVarintField(100, obj.local_accepted);
            }
        },
    };
    READSB.Statistics = {
        read(pbf, end) {
            return pbf.readFields(this._readField, {
                latest: undefined,
                last_1min: undefined,
                last_5min: undefined,
                last_15min: undefined,
                polar_range: [],
                total: undefined,
            }, end);
        },
        _readField(tag, obj, pbf) {
            let entry;
            if (tag === 1) {
                obj.latest = READSB.StatisticEntry.read(pbf, pbf.readVarint() + pbf.pos);
            }
            else if (tag === 2) {
                obj.last_1min = READSB.StatisticEntry.read(pbf, pbf.readVarint() + pbf.pos);
            }
            else if (tag === 3) {
                obj.last_5min = READSB.StatisticEntry.read(pbf, pbf.readVarint() + pbf.pos);
            }
            else if (tag === 4) {
                obj.last_15min = READSB.StatisticEntry.read(pbf, pbf.readVarint() + pbf.pos);
            }
            else if (tag === 5) {
                obj.total = READSB.StatisticEntry.read(pbf, pbf.readVarint() + pbf.pos);
            }
            else if (tag === 6) {
                entry = READSB.Statistics.PolarRangeEntry.read(pbf, pbf.readVarint() + pbf.pos);
                obj.polar_range[entry.key] = entry.value;
            }
        },
        write(obj, pbf) {
            if (obj.latest) {
                pbf.writeMessage(1, READSB.StatisticEntry.write, obj.latest);
            }
            if (obj.last_1min) {
                pbf.writeMessage(2, READSB.StatisticEntry.write, obj.last_1min);
            }
            if (obj.last_5min) {
                pbf.writeMessage(3, READSB.StatisticEntry.write, obj.last_5min);
            }
            if (obj.last_15min) {
                pbf.writeMessage(4, READSB.StatisticEntry.write, obj.last_15min);
            }
            if (obj.total) {
                pbf.writeMessage(5, READSB.StatisticEntry.write, obj.total);
            }
            if (obj.polar_range) {
                for (const i in obj.polar_range) {
                    if (Object.prototype.hasOwnProperty.call(obj.polar_range, i)) {
                        pbf.writeMessage(6, READSB.Statistics.PolarRangeEntry.write, { key: parseInt(i, 10), value: obj.polar_range[i] });
                    }
                }
            }
        },
        PolarRangeEntry: {
            read(pbf, end) {
                return pbf.readFields(READSB.Statistics.PolarRangeEntry._readField, {
                    key: 0,
                    value: 0,
                }, end);
            },
            _readField(tag, obj, pbf) {
                if (tag === 1) {
                    obj.key = pbf.readVarint();
                }
                else if (tag === 2) {
                    obj.value = pbf.readVarint();
                }
            },
            write(obj, pbf) {
                if (obj.key) {
                    pbf.writeVarintField(1, obj.key);
                }
                if (obj.value) {
                    pbf.writeVarintField(2, obj.value);
                }
            },
        },
    };
})(READSB || (READSB = {}));
//# sourceMappingURL=readsb-pb.js.map