// Part of readsb, a Mode-S/ADSB/TIS message decoder.
//
// typedef.d.ts: Custom Typescript definitions used in web application.
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

declare namespace READSB {
    /**
     * All app settings.
     */
    export interface IAppSettings {
        ShowAltitudeChart: boolean;
        CenterLat: number;
        CenterLon: number;
        DisplayUnits: string;
        ZoomLevel: number;
        SiteLat: number,
        SiteLon: number,
        ShowSite: boolean,
        ShowSiteCircles: boolean,
        SiteCirclesDistances: number[],
        PageName: string,
        ShowFlags: boolean,
        ShowAdditionalData: boolean,
        ShowAircraftCountInTitle: boolean,
        ShowMessageRateInTitle: boolean,
        OnlineDatabaseUrl: string,
        FlagPath: string,
        ShowChartBundleLayers: boolean,
        SkyVectorAPIKey: string,
        ShowAdditionalMaps: boolean,
        ShowHoverOverLabels: boolean,
        ShowUSLayers: boolean,
        ShowEULayers: boolean,
        EnableFilter: boolean,
        EnableHighlightFilter: boolean
        BaseLayer: string;
        OverlayLayers: string[];
        AppLanguage: string;
        HideAircraftsNotInView: boolean;
        UseDarkTheme: boolean;
        ShowTraceDetails: boolean;
        DimMap: boolean;
    }

    /*
     * Default application settings in defaults.json.
     */
    export interface IDefaultSettings {
        ShowAltitudeChart: boolean;
        CenterLat: number;
        CenterLon: number;
        DimMap: boolean,
        DisplayUnits: string;
        ZoomLevel: number;
        SiteLat: number,
        SiteLon: number,
        ShowSite: boolean,
        ShowSiteCircles: boolean,
        SiteCirclesDistances: string,
        PageName: string,
        ShowFlags: boolean,
        ShowAdditionalData: boolean,
        ShowAircraftCountInTitle: boolean,
        ShowMessageRateInTitle: boolean,
        OnlineDatabaseUrl: string,
        FlagPath: string,
        ShowChartBundleLayers: boolean,
        SkyVectorAPIKey: string,
        ShowAdditionalMaps: boolean,
        ShowHoverOverLabels: boolean,
        ShowUSLayers: boolean,
        ShowEULayers: boolean,
        EnableFilter: boolean,
        EnableHighlightFilter: boolean
        BaseLayer: string;
        OverlayLayers: string;
        AppLanguage: string;
        HideAircraftsNotInView: boolean;
        UseDarkTheme: boolean;
        ShowTraceDetails: boolean;
    }

    /**
     * An SVG shape.
     */
    export interface IShape {
        NoRotate?: boolean;
        Size: L.PointTuple;
        Svg: string;
    }

    /**
     * An SVG shape collection.
     */
    export interface IShapeCollection {
        [key: string]: IShape;
    }

    /**
     * Special squawk definition.
     */
    export interface ISpecialSquawk {
        CssClass: string;
        MarkerColor: string;
        Text: string;
    }

    /**
     * A Unit label.
     */
    interface IUnitLabel {
        [key: string]: string;
    }

    /**
     * TODO: Add descripion.
     */
    export interface IStride {
        Start: number;
        End?: number;
        S1: number;
        S2: number;
        Prefix: string;
        First?: string;
        Last?: string;
        Alphabet?: string;
        Offset?: number;
    }

    /**
     * A numeric ICAO address range.
     */
    export interface INumericMap {
        Start: number;
        First: number;
        Count: number;
        End?: number;
        Template: string;
    }

    /**
     * An ICAO address range for single country.
     */
    export interface IIcaoRange {
        Start: number;
        End: number;
        Country: string;
        FlagImage: string;
    }

    /**
     * Extend table row by visibily variables.
     */
    interface IAircraftListRow {
        Html: string;
        Visible: boolean; // True if row is visible in aircraft list.
    }

    /**
     * An aircraft record.
     */
    export interface IAircraft {
        Icao: string;
        IcaoRange: IIcaoRange;
        Flight: string;
        Squawk: string;
        Category: string;
        Operator: string;
        Callsign: string;
        AddrType: string;
        Altitude: number;
        AltBaro: number;
        AltGeom: number;
        Speed: number;
        Gs: number;
        Ias: number;
        Tas: number;
        Track: number;
        TrackRate: number;
        MagHeading: number;
        TrueHeading: number;
        Mach: number;
        Roll: number;
        NavAltitude: number;
        NavHeading: number;
        NavModes: string[];
        NavQnh: number;
        Rc: number;
        NacP: number;
        NacV: number;
        NicBaro: number;
        SilType: string;
        Sil: number;
        BaroRate: number;
        GeomRate: number;
        VertRate: number;
        Version: number;
        Position: L.LatLng;
        PositionFromMlat: boolean;
        SiteDist: number;
        Messages: number;
        Rssi: number;
        HistorySize: number;
        Seen: number;
        SeenPos: number;
        LastMessageTime: number;
        VisibleInList: boolean;
        Registration: string;
        IcaoType: string;
        TypeDescription: string;
        Species: string;
        Wtc: string;
        CivilMil: boolean;
        Interesting: boolean;
        SortPos: number;
        SortValue: number;
        DataSource: string;
        ExternalInfoLink: string;
        Alert: boolean;
        SPIdent: boolean;
        UpdateData(receiverTimestamp: number, data: IAircraftMeta): void;
        UpdateVisibility(receiverTimestamp: number): boolean;
    }

    /**
     * One segment of an aircraft track.
     */
    interface ITrackSegment {
        Altitude: number;
        Estimated: boolean;
        Line: L.Polyline;
        Ground: boolean;
        UpdateTime: number;
    }

    /**
     * Aircraft message count history.
     */
    interface IMessageCountHistory {
        time: number;
        messages: number;
    }

    /**
     * Describes an aircraft filter.
     */
    export interface IAircraftFilter {
        IsActive: boolean;
        Value1: any;
        Value2: any;
        Type: eAircraftFilterType;
        MatchType: eFilterMatchType;
        Label: string;
        I18n: string;
        MinValue?: number;
        MaxValue?: number;
        DecimalPlaces?: number;
        InputWidth?: eInputWidth;
        Condition: eCondition;
        FilterConditions: eCondition[];
        EnumValues?: any[];
        Validate?(): void;
        IsFiltered?(aircraft: IAircraft): boolean;
    }

    /**
     * Aircraft database entry.
     */
    export interface IAircraftDatabase {
        [key: string]: {
            d: string;
            f: string;
            r: string;
            t: string;
        };
    }

    /**
     * Operator database entry.
     */
    export interface IOperatorDatabase {
        [key: string]: {
            n: string;
            c: string;
            r: string;
        };
    }

    /**
     * Aircraft type database entry.
     */
    export interface ITypeDatabase {
        [key: string]: {
            desc: string;
            wtc: string;
        };
    }

    /**
     * Statistics of aircraft collection.
     */
    export interface ICollectionStatistics {
        Version: string;
        Refresh: number;
        MessageRate: number;
        Now: number;
        TrackedAircrafts: number;
        TrackedAircraftPositions: number;
        TrackedAircraftUnknown: number;
        TrackedHistorySize: number;
    }
}
