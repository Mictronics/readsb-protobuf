// Part of readsb, a Mode-S/ADSB/TIS message decoder.
//
// readsb-pb.ts: Reading readsb protocol buffer via pbf.
// See <https://github.com/mapbox/pbf>
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
//
// tslint:disable: one-line
// tslint:disable: object-literal-sort-keys
namespace READSB {
    export const AircraftMeta = {
        NavModes: {
            read(pbf: Pbf, end?: number): INavModes {
                return pbf.readFields(this._readField,
                    {
                        althold: false,
                        approach: false,
                        autopilot: false,
                        lnav: false,
                        tcas: false,
                        vnav: false,
                    }, end);
            },
            _readField(tag: number, obj: any, pbf: Pbf): void {
                if (tag === 1) { obj.autopilot = pbf.readBoolean(); }
                else if (tag === 2) { obj.vnav = pbf.readBoolean(); }
                else if (tag === 3) { obj.althold = pbf.readBoolean(); }
                else if (tag === 4) { obj.approach = pbf.readBoolean(); }
                else if (tag === 5) { obj.lnav = pbf.readBoolean(); }
                else if (tag === 6) { obj.tcas = pbf.readBoolean(); }
            },
            write(obj: INavModes, pbf: Pbf): void {
                if (obj.autopilot) { pbf.writeBooleanField(1, obj.autopilot); }
                if (obj.vnav) { pbf.writeBooleanField(2, obj.vnav); }
                if (obj.althold) { pbf.writeBooleanField(3, obj.althold); }
                if (obj.approach) { pbf.writeBooleanField(4, obj.approach); }
                if (obj.lnav) { pbf.writeBooleanField(5, obj.lnav); }
                if (obj.tcas) { pbf.writeBooleanField(6, obj.tcas); }
            },
        },
        ValidSource: {
            read(pbf: Pbf, end?: number): IValidSource {
                return pbf.readFields(this._readField,
                    {
                        alt_geom: false,
                        altitude: false,
                        baro_rate: false,
                        callsign: false,
                        emergency: false,
                        geom_rate: false,
                        gs: false,
                        gva: false,
                        ias: false,
                        lat: false,
                        lon: false,
                        mach: false,
                        mag_heading: false,
                        nac_p: false,
                        nac_v: false,
                        nav_altitude_fms: false,
                        nav_altitude_mcp: false,
                        nav_heading: false,
                        nav_modes: false,
                        nav_qnh: false,
                        nic: false,
                        nic_baro: false,
                        rc: false,
                        roll: false,
                        sda: false,
                        sil: false,
                        sil_type: false,
                        squawk: false,
                        tas: false,
                        track: false,
                        track_rate: false,
                        true_heading: false,
                    }, end);
            },
            _readField(tag: number, obj: any, pbf: Pbf): void {
                if (tag === 100) { obj.callsign = pbf.readBoolean(); }
                else if (tag === 101) { obj.altitude = pbf.readBoolean(); }
                else if (tag === 102) { obj.alt_geom = pbf.readBoolean(); }
                else if (tag === 103) { obj.gs = pbf.readBoolean(); }
                else if (tag === 104) { obj.ias = pbf.readBoolean(); }
                else if (tag === 105) { obj.tas = pbf.readBoolean(); }
                else if (tag === 106) { obj.mach = pbf.readBoolean(); }
                else if (tag === 107) { obj.track = pbf.readBoolean(); }
                else if (tag === 108) { obj.track_rate = pbf.readBoolean(); }
                else if (tag === 109) { obj.roll = pbf.readBoolean(); }
                else if (tag === 110) { obj.mag_heading = pbf.readBoolean(); }
                else if (tag === 111) { obj.true_heading = pbf.readBoolean(); }
                else if (tag === 112) { obj.baro_rate = pbf.readBoolean(); }
                else if (tag === 113) { obj.geom_rate = pbf.readBoolean(); }
                else if (tag === 114) { obj.squawk = pbf.readBoolean(); }
                else if (tag === 115) { obj.emergency = pbf.readBoolean(); }
                else if (tag === 116) { obj.nav_qnh = pbf.readBoolean(); }
                else if (tag === 117) { obj.nav_altitude_mcp = pbf.readBoolean(); }
                else if (tag === 118) { obj.nav_altitude_fms = pbf.readBoolean(); }
                else if (tag === 119) { obj.nav_heading = pbf.readBoolean(); }
                else if (tag === 120) { obj.nav_modes = pbf.readBoolean(); }
                else if (tag === 121) { obj.lat = pbf.readBoolean(); }
                else if (tag === 122) { obj.lon = pbf.readBoolean(); }
                else if (tag === 123) { obj.nic = pbf.readBoolean(); }
                else if (tag === 124) { obj.rc = pbf.readBoolean(); }
                else if (tag === 125) { obj.nic_baro = pbf.readBoolean(); }
                else if (tag === 126) { obj.nac_p = pbf.readBoolean(); }
                else if (tag === 127) { obj.nac_v = pbf.readBoolean(); }
                else if (tag === 128) { obj.sil = pbf.readBoolean(); }
                else if (tag === 129) { obj.sil_type = pbf.readBoolean(); }
                else if (tag === 130) { obj.gva = pbf.readBoolean(); }
                else if (tag === 131) { obj.sda = pbf.readBoolean(); }
            },
            write(obj: IValidSource, pbf: Pbf): void {
                if (obj.callsign) { pbf.writeBooleanField(100, obj.callsign); }
                if (obj.altitude) { pbf.writeBooleanField(101, obj.altitude); }
                if (obj.alt_geom) { pbf.writeBooleanField(102, obj.alt_geom); }
                if (obj.gs) { pbf.writeBooleanField(103, obj.gs); }
                if (obj.ias) { pbf.writeBooleanField(104, obj.ias); }
                if (obj.tas) { pbf.writeBooleanField(105, obj.tas); }
                if (obj.mach) { pbf.writeBooleanField(106, obj.mach); }
                if (obj.track) { pbf.writeBooleanField(107, obj.track); }
                if (obj.track_rate) { pbf.writeBooleanField(108, obj.track_rate); }
                if (obj.roll) { pbf.writeBooleanField(109, obj.roll); }
                if (obj.mag_heading) { pbf.writeBooleanField(110, obj.mag_heading); }
                if (obj.true_heading) { pbf.writeBooleanField(111, obj.true_heading); }
                if (obj.baro_rate) { pbf.writeBooleanField(112, obj.baro_rate); }
                if (obj.geom_rate) { pbf.writeBooleanField(113, obj.geom_rate); }
                if (obj.squawk) { pbf.writeBooleanField(114, obj.squawk); }
                if (obj.emergency) { pbf.writeBooleanField(115, obj.emergency); }
                if (obj.nav_qnh) { pbf.writeBooleanField(116, obj.nav_qnh); }
                if (obj.nav_altitude_mcp) { pbf.writeBooleanField(117, obj.nav_altitude_mcp); }
                if (obj.nav_altitude_fms) { pbf.writeBooleanField(118, obj.nav_altitude_fms); }
                if (obj.nav_heading) { pbf.writeBooleanField(119, obj.nav_heading); }
                if (obj.nav_modes) { pbf.writeBooleanField(120, obj.nav_modes); }
                if (obj.lat) { pbf.writeBooleanField(121, obj.lat); }
                if (obj.lon) { pbf.writeBooleanField(122, obj.lon); }
                if (obj.nic) { pbf.writeBooleanField(123, obj.nic); }
                if (obj.rc) { pbf.writeBooleanField(124, obj.rc); }
                if (obj.nic_baro) { pbf.writeBooleanField(125, obj.nic_baro); }
                if (obj.nac_p) { pbf.writeBooleanField(126, obj.nac_p); }
                if (obj.nac_v) { pbf.writeBooleanField(127, obj.nac_v); }
                if (obj.sil) { pbf.writeBooleanField(128, obj.sil); }
                if (obj.sil_type) { pbf.writeBooleanField(129, obj.sil_type); }
                if (obj.gva) { pbf.writeBooleanField(130, obj.gva); }
                if (obj.sda) { pbf.writeBooleanField(131, obj.sda); }
            },
        },
        read(pbf: Pbf, end?: number): IAircraftMeta {
            return pbf.readFields(this._readField,
                {
                    addr: null,
                    addr_type: null,
                    air_ground: null,
                    alert: false,
                    alt_baro: null,
                    alt_geom: null,
                    baro_rate: null,
                    category: null,
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
                }, end);
        },
        _readField(tag: number, obj: any, pbf: Pbf): void {
            if (tag === 1) { obj.addr = pbf.readVarint(); }
            else if (tag === 2) { obj.flight = pbf.readString(); }
            else if (tag === 3) { obj.squawk = pbf.readVarint(); }
            else if (tag === 4) { obj.category = pbf.readVarint(); }
            else if (tag === 5) { obj.alt_baro = pbf.readVarint(true); }
            else if (tag === 6) { obj.mag_heading = pbf.readVarint(true); }
            else if (tag === 7) { obj.ias = pbf.readVarint(); }
            else if (tag === 8) { obj.lat = pbf.readDouble(); }
            else if (tag === 9) { obj.lon = pbf.readDouble(); }
            else if (tag === 10) { obj.messages = pbf.readVarint(); }
            else if (tag === 11) { obj.seen = pbf.readVarint(); }
            else if (tag === 12) { obj.rssi = pbf.readFloat(); }
            else if (tag === 15) { obj.air_ground = pbf.readVarint(); }
            else if (tag === 20) { obj.alt_geom = pbf.readVarint(true); }
            else if (tag === 21) { obj.baro_rate = pbf.readVarint(true); }
            else if (tag === 22) { obj.geom_rate = pbf.readVarint(true); }
            else if (tag === 23) { obj.gs = pbf.readVarint(); }
            else if (tag === 24) { obj.tas = pbf.readVarint(); }
            else if (tag === 25) { obj.mach = pbf.readFloat(); }
            else if (tag === 26) { obj.true_heading = pbf.readVarint(true); }
            else if (tag === 27) { obj.track = pbf.readVarint(true); }
            else if (tag === 28) { obj.track_rate = pbf.readFloat(); }
            else if (tag === 29) { obj.roll = pbf.readFloat(); }
            else if (tag === 30) { obj.nav_qnh = pbf.readFloat(); }
            else if (tag === 31) { obj.nav_altitude_mcp = pbf.readVarint(true); }
            else if (tag === 32) { obj.nav_altitude_fms = pbf.readVarint(true); }
            else if (tag === 33) { obj.nav_heading = pbf.readVarint(true); }
            else if (tag === 34) { obj.nic = pbf.readVarint(); }
            else if (tag === 35) { obj.rc = pbf.readVarint(); }
            else if (tag === 36) { obj.version = pbf.readVarint(true); }
            else if (tag === 37) { obj.nic_baro = pbf.readVarint(); }
            else if (tag === 38) { obj.nac_p = pbf.readVarint(); }
            else if (tag === 39) { obj.nac_v = pbf.readVarint(); }
            else if (tag === 40) { obj.sil = pbf.readVarint(); }
            else if (tag === 41) { obj.seen_pos = pbf.readVarint(); }
            else if (tag === 42) { obj.alert = pbf.readBoolean(); }
            else if (tag === 43) { obj.spi = pbf.readBoolean(); }
            else if (tag === 44) { obj.gva = pbf.readVarint(); }
            else if (tag === 45) { obj.sda = pbf.readVarint(); }
            else if (tag === 100) { obj.addr_type = pbf.readVarint(); }
            else if (tag === 101) { obj.emergency = pbf.readVarint(); }
            else if (tag === 102) { obj.sil_type = pbf.readVarint(); }
            else if (tag === 150) { obj.nav_modes = AircraftMeta.NavModes.read(pbf, pbf.readVarint() + pbf.pos); }
            else if (tag === 151) { obj.mlat = AircraftMeta.ValidSource.read(pbf, pbf.readVarint() + pbf.pos); }
            else if (tag === 152) { obj.tisb = AircraftMeta.ValidSource.read(pbf, pbf.readVarint() + pbf.pos); }
        },
        write(obj: IAircraftMeta, pbf: Pbf): void {
            if (obj.addr) { pbf.writeVarintField(1, obj.addr); }
            if (obj.flight) { pbf.writeStringField(2, obj.flight); }
            if (obj.squawk) { pbf.writeVarintField(3, obj.squawk); }
            if (obj.category) { pbf.writeVarintField(4, obj.category); }
            if (obj.alt_baro) { pbf.writeVarintField(5, obj.alt_baro); }
            if (obj.mag_heading) { pbf.writeVarintField(6, obj.mag_heading); }
            if (obj.ias) { pbf.writeVarintField(7, obj.ias); }
            if (obj.lat) { pbf.writeDoubleField(8, obj.lat); }
            if (obj.lon) { pbf.writeDoubleField(9, obj.lon); }
            if (obj.messages) { pbf.writeVarintField(10, obj.messages); }
            if (obj.seen) { pbf.writeVarintField(11, obj.seen); }
            if (obj.rssi) { pbf.writeFloatField(12, obj.rssi); }
            if (obj.air_ground) { pbf.writeVarintField(15, obj.air_ground); }
            if (obj.alt_geom) { pbf.writeVarintField(20, obj.alt_geom); }
            if (obj.baro_rate) { pbf.writeVarintField(21, obj.baro_rate); }
            if (obj.geom_rate) { pbf.writeVarintField(22, obj.geom_rate); }
            if (obj.gs) { pbf.writeVarintField(23, obj.gs); }
            if (obj.tas) { pbf.writeVarintField(24, obj.tas); }
            if (obj.mach) { pbf.writeFloatField(25, obj.mach); }
            if (obj.true_heading) { pbf.writeVarintField(26, obj.true_heading); }
            if (obj.track) { pbf.writeVarintField(27, obj.track); }
            if (obj.track_rate) { pbf.writeFloatField(28, obj.track_rate); }
            if (obj.roll) { pbf.writeFloatField(29, obj.roll); }
            if (obj.nav_qnh) { pbf.writeFloatField(30, obj.nav_qnh); }
            if (obj.nav_altitude_mcp) { pbf.writeVarintField(31, obj.nav_altitude_mcp); }
            if (obj.nav_altitude_fms) { pbf.writeVarintField(32, obj.nav_altitude_fms); }
            if (obj.nav_heading) { pbf.writeVarintField(33, obj.nav_heading); }
            if (obj.nic) { pbf.writeVarintField(34, obj.nic); }
            if (obj.rc) { pbf.writeVarintField(35, obj.rc); }
            if (obj.version) { pbf.writeVarintField(36, obj.version); }
            if (obj.nic_baro) { pbf.writeVarintField(37, obj.nic_baro); }
            if (obj.nac_p) { pbf.writeVarintField(38, obj.nac_p); }
            if (obj.nac_v) { pbf.writeVarintField(39, obj.nac_v); }
            if (obj.sil) { pbf.writeVarintField(40, obj.sil); }
            if (obj.seen_pos) { pbf.writeVarintField(41, obj.seen_pos); }
            if (obj.alert) { pbf.writeBooleanField(42, obj.alert); }
            if (obj.spi) { pbf.writeBooleanField(43, obj.spi); }
            if (obj.gva) { pbf.writeVarintField(44, obj.gva); }
            if (obj.sda) { pbf.writeVarintField(45, obj.sda); }
            if (obj.addr_type) { pbf.writeVarintField(100, obj.addr_type); }
            if (obj.emergency) { pbf.writeVarintField(101, obj.emergency); }
            if (obj.sil_type) { pbf.writeVarintField(102, obj.sil_type); }
            if (obj.nav_modes) { pbf.writeMessage(150, AircraftMeta.NavModes.write, obj.nav_modes); }
            if (obj.mlat) { pbf.writeMessage(151, AircraftMeta.ValidSource.write, obj.mlat); }
            if (obj.tisb) { pbf.writeMessage(152, AircraftMeta.ValidSource.write, obj.tisb); }
        },
    };

    export const AircraftsUpdate = {
        read(pbf: Pbf, end?: number): IAircraftsUpdate {
            return pbf.readFields(this._readField,
                {
                    now: 0,
                    messages: 0,
                    aircraft: [],
                }, end);
        },
        _readField(tag: number, obj: any, pbf: Pbf): void {
            if (tag === 1) { obj.now = pbf.readVarint(); }
            else if (tag === 2) { obj.messages = pbf.readVarint(); }
            else if (tag === 15) { obj.aircraft.push(AircraftMeta.read(pbf, pbf.readVarint() + pbf.pos)); }
        },
        write(obj: IAircraftsUpdate, pbf: Pbf) {
            if (obj.now) { pbf.writeVarintField(1, obj.now); }
            if (obj.messages) { pbf.writeVarintField(2, obj.messages); }
            if (obj.aircraft) {
                for (const ac of obj.aircraft) {
                    pbf.writeMessage(15, AircraftMeta.write, ac);
                }
            }
        },
    };

    export const Receiver = {
        read(pbf: Pbf, end?: number): IReceiver {
            return pbf.readFields(this._readField,
                {
                    version: null,
                    refresh: null,
                    latitude: null,
                    longitude: null,
                    history: null,
                }, end);
        },
        _readField(tag: number, obj: any, pbf: Pbf): void {
            if (tag === 1) { obj.version = pbf.readString(); }
            else if (tag === 2) { obj.refresh = pbf.readFloat(); }
            else if (tag === 3) { obj.latitude = pbf.readDouble(); }
            else if (tag === 4) { obj.longitude = pbf.readDouble(); }
            else if (tag === 15) { obj.history = pbf.readVarint(); }
        },
        write(obj: IReceiver, pbf: Pbf) {
            if (obj.version) { pbf.writeStringField(1, obj.version); }
            if (obj.refresh) { pbf.writeFloatField(2, obj.refresh); }
            if (obj.latitude) { pbf.writeDoubleField(3, obj.latitude); }
            if (obj.longitude) { pbf.writeDoubleField(4, obj.longitude); }
            if (obj.history) { pbf.writeVarintField(15, obj.history); }
        },
    };

    export const StatisticEntry = {
        read(pbf: Pbf, end?: number): IStatisticEntry {
            return pbf.readFields(this._readField,
                {
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
                    remote_modeac: 0,
                    remote_modes: 0,
                    remote_bad: 0,
                    remote_unknown_icao: 0,
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
        _readField(tag: number, obj: any, pbf: Pbf): void {
            if (tag === 1) { obj.start = pbf.readVarint(); }
            else if (tag === 2) { obj.stop = pbf.readVarint(); }
            else if (tag === 3) { obj.messages = pbf.readVarint(); }
            else if (tag === 4) { obj.max_distance_in_metres = pbf.readVarint(); }
            else if (tag === 5) { obj.max_distance_in_nautical_miles = pbf.readVarint(); }
            else if (tag === 6) { obj.altitude_suppressed = pbf.readVarint(); }
            else if (tag === 7) { obj.tracks_all = pbf.readVarint(); }
            else if (tag === 8) { obj.tracks_single_message = pbf.readVarint(); }
            else if (tag === 20) { obj.cpu_demod = pbf.readVarint(); }
            else if (tag === 21) { obj.cpu_reader = pbf.readVarint(); }
            else if (tag === 22) { obj.cpu_background = pbf.readVarint(); }
            else if (tag === 40) { obj.cpr_surface = pbf.readVarint(); }
            else if (tag === 41) { obj.cpr_airborne = pbf.readVarint(); }
            else if (tag === 42) { obj.cpr_global_ok = pbf.readVarint(); }
            else if (tag === 43) { obj.cpr_global_bad = pbf.readVarint(); }
            else if (tag === 44) { obj.cpr_global_range = pbf.readVarint(); }
            else if (tag === 45) { obj.cpr_global_speed = pbf.readVarint(); }
            else if (tag === 46) { obj.cpr_global_skipped = pbf.readVarint(); }
            else if (tag === 47) { obj.cpr_local_ok = pbf.readVarint(); }
            else if (tag === 48) { obj.cpr_local_aircraft_relative = pbf.readVarint(); }
            else if (tag === 49) { obj.cpr_local_receiver_relative = pbf.readVarint(); }
            else if (tag === 50) { obj.cpr_local_skipped = pbf.readVarint(); }
            else if (tag === 51) { obj.cpr_local_range = pbf.readVarint(); }
            else if (tag === 52) { obj.cpr_local_speed = pbf.readVarint(); }
            else if (tag === 53) { obj.cpr_filtered = pbf.readVarint(); }
            else if (tag === 70) { obj.remote_modeac = pbf.readVarint(); }
            else if (tag === 71) { obj.remote_modes = pbf.readVarint(); }
            else if (tag === 72) { obj.remote_bad = pbf.readVarint(); }
            else if (tag === 73) { obj.remote_unknown_icao = pbf.readVarint(); }
            else if (tag === 90) { obj.local_samples_processed = pbf.readVarint(); }
            else if (tag === 91) { obj.local_samples_dropped = pbf.readVarint(); }
            else if (tag === 92) { obj.local_modeac = pbf.readVarint(); }
            else if (tag === 93) { obj.local_modes = pbf.readVarint(); }
            else if (tag === 94) { obj.local_bad = pbf.readVarint(); }
            else if (tag === 95) { obj.local_unknown_icao = pbf.readVarint(); }
            else if (tag === 96) { obj.local_strong_signals = pbf.readVarint(); }
            else if (tag === 97) { obj.local_signal = pbf.readFloat(); }
            else if (tag === 98) { obj.local_noise = pbf.readFloat(); }
            else if (tag === 99) { obj.local_peak_signal = pbf.readFloat(); }
        },
        write(obj: IStatisticEntry, pbf: Pbf) {
            if (obj.start) { pbf.writeVarintField(1, obj.start); }
            if (obj.stop) { pbf.writeVarintField(2, obj.stop); }
            if (obj.messages) { pbf.writeVarintField(3, obj.messages); }
            if (obj.max_distance_in_metres) { pbf.writeVarintField(4, obj.max_distance_in_metres); }
            if (obj.max_distance_in_nautical_miles) { pbf.writeVarintField(5, obj.max_distance_in_nautical_miles); }
            if (obj.altitude_suppressed) { pbf.writeVarintField(6, obj.altitude_suppressed); }
            if (obj.tracks_all) { pbf.writeVarintField(7, obj.tracks_all); }
            if (obj.tracks_single_message) { pbf.writeVarintField(8, obj.tracks_single_message); }
            if (obj.cpu_demod) { pbf.writeVarintField(20, obj.cpu_demod); }
            if (obj.cpu_reader) { pbf.writeVarintField(21, obj.cpu_reader); }
            if (obj.cpu_background) { pbf.writeVarintField(22, obj.cpu_background); }
            if (obj.cpr_surface) { pbf.writeVarintField(40, obj.cpr_surface); }
            if (obj.cpr_airborne) { pbf.writeVarintField(41, obj.cpr_airborne); }
            if (obj.cpr_global_ok) { pbf.writeVarintField(42, obj.cpr_global_ok); }
            if (obj.cpr_global_bad) { pbf.writeVarintField(43, obj.cpr_global_bad); }
            if (obj.cpr_global_range) { pbf.writeVarintField(44, obj.cpr_global_range); }
            if (obj.cpr_global_speed) { pbf.writeVarintField(45, obj.cpr_global_speed); }
            if (obj.cpr_global_skipped) { pbf.writeVarintField(46, obj.cpr_global_skipped); }
            if (obj.cpr_local_ok) { pbf.writeVarintField(47, obj.cpr_local_ok); }
            if (obj.cpr_local_aircraft_relative) { pbf.writeVarintField(48, obj.cpr_local_aircraft_relative); }
            if (obj.cpr_local_receiver_relative) { pbf.writeVarintField(49, obj.cpr_local_receiver_relative); }
            if (obj.cpr_local_skipped) { pbf.writeVarintField(50, obj.cpr_local_skipped); }
            if (obj.cpr_local_range) { pbf.writeVarintField(51, obj.cpr_local_range); }
            if (obj.cpr_local_speed) { pbf.writeVarintField(52, obj.cpr_local_speed); }
            if (obj.cpr_filtered) { pbf.writeVarintField(53, obj.cpr_filtered); }
            if (obj.remote_modeac) { pbf.writeVarintField(70, obj.remote_modeac); }
            if (obj.remote_modes) { pbf.writeVarintField(71, obj.remote_modes); }
            if (obj.remote_bad) { pbf.writeVarintField(72, obj.remote_bad); }
            if (obj.remote_unknown_icao) { pbf.writeVarintField(73, obj.remote_unknown_icao); }
            if (obj.local_samples_processed) { pbf.writeVarintField(90, obj.local_samples_processed); }
            if (obj.local_samples_dropped) { pbf.writeVarintField(91, obj.local_samples_dropped); }
            if (obj.local_modeac) { pbf.writeVarintField(92, obj.local_modeac); }
            if (obj.local_modes) { pbf.writeVarintField(93, obj.local_modes); }
            if (obj.local_bad) { pbf.writeVarintField(94, obj.local_bad); }
            if (obj.local_unknown_icao) { pbf.writeVarintField(95, obj.local_unknown_icao); }
            if (obj.local_strong_signals) { pbf.writeVarintField(96, obj.local_strong_signals); }
            if (obj.local_signal) { pbf.writeFloatField(97, obj.local_signal); }
            if (obj.local_noise) { pbf.writeFloatField(98, obj.local_noise); }
            if (obj.local_peak_signal) { pbf.writeFloatField(99, obj.local_peak_signal); }
        },
    };

    export const Statistics = {
        read(pbf: Pbf, end?: number): IStatistics {
            return pbf.readFields(this._readField,
                {
                    latest: undefined,
                    last_1min: undefined,
                    last_5min: undefined,
                    last_15min: undefined,
                    total: undefined,
                }, end);
        },
        _readField(tag: number, obj: any, pbf: Pbf): void {
            if (tag === 1) { obj.latest = StatisticEntry.read(pbf, pbf.readVarint() + pbf.pos); }
            else if (tag === 2) { obj.last_1min = StatisticEntry.read(pbf, pbf.readVarint() + pbf.pos); }
            else if (tag === 3) { obj.last_5min = StatisticEntry.read(pbf, pbf.readVarint() + pbf.pos); }
            else if (tag === 4) { obj.last_15min = StatisticEntry.read(pbf, pbf.readVarint() + pbf.pos); }
            else if (tag === 5) { obj.total = StatisticEntry.read(pbf, pbf.readVarint() + pbf.pos); }
        },
        write(obj: IStatistics, pbf: Pbf): void {
            if (obj.latest) { pbf.writeMessage(1, StatisticEntry.write, obj.latest); }
            if (obj.last_1min) { pbf.writeMessage(2, StatisticEntry.write, obj.last_1min); }
            if (obj.last_5min) { pbf.writeMessage(3, StatisticEntry.write, obj.last_5min); }
            if (obj.last_15min) { pbf.writeMessage(4, StatisticEntry.write, obj.last_15min); }
            if (obj.total) { pbf.writeMessage(5, StatisticEntry.write, obj.total); }
        },
    };
}
