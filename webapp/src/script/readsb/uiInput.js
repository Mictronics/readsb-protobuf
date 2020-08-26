"use strict";
var READSB;
(function (READSB) {
    class Input {
        static Init() {
            document.getElementById("showFlagsCheck").addEventListener("change", this.OnSettingsCheckChanged);
            document.getElementById("showFlagsCheck").checked = READSB.AppSettings.ShowFlags;
            document.getElementById("showAircraftCountCheck").addEventListener("change", this.OnSettingsCheckChanged);
            document.getElementById("showAircraftCountCheck").checked = READSB.AppSettings.ShowAircraftCountInTitle;
            document.getElementById("showMessageRateCheck").addEventListener("change", this.OnSettingsCheckChanged);
            document.getElementById("showMessageRateCheck").checked = READSB.AppSettings.ShowMessageRateInTitle;
            document.getElementById("showAdditionalDataCheck").addEventListener("change", this.OnSettingsCheckChanged);
            document.getElementById("showAdditionalDataCheck").checked = READSB.AppSettings.ShowAdditionalData;
            document.getElementById("hideAircraftNotInViewCheck").addEventListener("change", this.OnSettingsCheckChanged);
            document.getElementById("hideAircraftNotInViewCheck").checked = READSB.AppSettings.HideAircraftsNotInView;
            document.getElementById("showTraceDetailsCheck").addEventListener("change", this.OnSettingsCheckChanged);
            document.getElementById("showTraceDetailsCheck").checked = READSB.AppSettings.ShowTraceDetails;
            document.getElementById("useDarkThemeCheck").addEventListener("change", this.OnSettingsCheckChanged);
            document.getElementById("useDarkThemeCheck").addEventListener("change", this.OnSettingsCheckChanged);
            document.getElementById("useDarkThemeCheck").checked = READSB.AppSettings.UseDarkTheme;
            document.getElementById("dimMapCheck").addEventListener("change", this.OnSettingsCheckChanged);
            document.getElementById("dimMapCheck").checked = READSB.AppSettings.DimMap;
            document.getElementById("saveSettingsButton").addEventListener("click", this.OnSaveSettingsButtonClick);
            if (READSB.AppSettings.SiteCirclesDistances.length !== 0) {
                let s = "";
                for (const c of READSB.AppSettings.SiteCirclesDistances) {
                    s += `${c},`;
                }
                s = s.substr(0, s.length - 1);
                document.getElementById("inputSiteCirclesDistance").value = s;
            }
            document.getElementById("inputSkyVectorApiKey").value = READSB.AppSettings.SkyVectorAPIKey;
        }
        static SetSiteCoordinates() {
            document.getElementById("inputSiteLat").value = READSB.AppSettings.SiteLat.toString();
            document.getElementById("inputSiteLon").value = READSB.AppSettings.SiteLon.toString();
        }
        static OnSettingsCheckChanged(e) {
            const id = e.target.id;
            const checked = e.target.checked;
            const p = document.getElementsByClassName("leaflet-tile-pane");
            switch (id) {
                case "showFlagsCheck":
                    READSB.AppSettings.ShowFlags = checked;
                    READSB.Body.ShowFlags(checked);
                    break;
                case "showAircraftCountCheck":
                    READSB.AppSettings.ShowAircraftCountInTitle = checked;
                    break;
                case "showMessageRateCheck":
                    READSB.AppSettings.ShowMessageRateInTitle = checked;
                    break;
                case "showAdditionalDataCheck":
                    READSB.AppSettings.ShowAdditionalData = checked;
                    break;
                case "hideAircraftNotInViewCheck":
                    READSB.AppSettings.HideAircraftsNotInView = checked;
                    break;
                case "useDarkThemeCheck":
                    READSB.AppSettings.UseDarkTheme = checked;
                    if (checked) {
                        document.documentElement.setAttribute("data-theme", "dark");
                        const radio = document.getElementById("osm dark");
                        if (radio) {
                            radio.click();
                        }
                    }
                    else {
                        document.documentElement.setAttribute("data-theme", "light");
                        if (READSB.AppSettings.DimMap) {
                            p[0].style.filter = "brightness(0.5)";
                        }
                    }
                    READSB.LMap.CreateSiteCircles();
                    break;
                case "showTraceDetailsCheck":
                    READSB.AppSettings.ShowTraceDetails = checked;
                    break;
                case "dimMapCheck":
                    READSB.AppSettings.DimMap = checked;
                    if (checked) {
                        p[0].style.filter = "brightness(0.5)";
                    }
                    else {
                        p[0].style.filter = "";
                    }
                    break;
                default:
                    break;
            }
        }
        static OnSaveSettingsButtonClick(e) {
            let input = document.getElementById("inputPageName");
            let backendSetSitePosition = false;
            input.classList.remove("is-invalid", "is-valid");
            if (input.value !== "") {
                const name = input.value.trim().substring(0, 30);
                READSB.AppSettings.PageName = name;
                document.title = name;
                document.getElementById("infoblockName").innerText = name;
                input.classList.add("is-valid");
            }
            let lat = READSB.AppSettings.SiteLat;
            let lon = READSB.AppSettings.SiteLon;
            input = document.getElementById("inputSiteLat");
            input.classList.remove("is-invalid", "is-valid");
            if (input.value !== "") {
                lat = Number.parseFloat(input.value);
                if (lat !== Number.NaN && lat >= -90.0 && lat <= 90.0) {
                    READSB.AppSettings.SiteLat = lat;
                    backendSetSitePosition = true;
                    input.classList.add("is-valid");
                }
                else {
                    input.classList.add("is-invalid");
                }
            }
            input = document.getElementById("inputSiteLon");
            input.classList.remove("is-invalid", "is-valid");
            if (input.value !== "") {
                lon = Number.parseFloat(input.value);
                if (lon !== Number.NaN && lon >= -180.0 && lon <= 180.0) {
                    READSB.AppSettings.SiteLon = lon;
                    backendSetSitePosition = true;
                    input.classList.add("is-valid");
                }
                else {
                    input.classList.add("is-invalid");
                }
            }
            if (backendSetSitePosition) {
                READSB.Body.SetSitePosition();
            }
            input = document.getElementById("inputSiteCirclesDistance");
            input.classList.remove("is-invalid", "is-valid");
            if (input.value !== "") {
                const csvIn = input.value.trim().split(",", 100);
                const csvOut = [];
                let error = false;
                for (const s of csvIn) {
                    const n = Number.parseFloat(s);
                    if (!isNaN(n) && isFinite(n)) {
                        csvOut.push(n);
                    }
                    else {
                        error = true;
                    }
                }
                if (!error) {
                    READSB.AppSettings.SiteCirclesDistances = csvOut;
                    READSB.LMap.CreateSiteCircles();
                    input.classList.add("is-valid");
                }
                else {
                    input.classList.add("is-invalid");
                }
            }
            input = document.getElementById("inputSkyVectorApiKey");
            input.classList.remove("is-invalid", "is-valid");
            READSB.AppSettings.SkyVectorAPIKey = input.value;
            input.classList.add("is-valid");
        }
    }
    READSB.Input = Input;
})(READSB || (READSB = {}));
//# sourceMappingURL=uiInput.js.map