"use strict";
let timeFrame = "24h";
const refreshInterval = 60000;
let rangeUnit = localStorage.getItem("ReadsbGraphsRangeUnit");
if (rangeUnit === null) {
    rangeUnit = "nautical";
}
let temperatureUnit = localStorage.getItem("ReadsbGraphsTemperatureUnit");
if (temperatureUnit === null) {
    temperatureUnit = "celsius";
}
document.addEventListener("DOMContentLoaded", () => {
    switchView(timeFrame);
    window.setInterval(() => {
        switchView(timeFrame);
    }, refreshInterval);
});
function switchView(newTimeFrame) {
    timeFrame = newTimeFrame;
    const timeStamp = new Date().getTime() / 1000;
    document.getElementById("local-trailing-rate-image").src = `images/readsb-local_trailing_rate-${timeFrame}.png?time=${timeStamp}`;
    document.getElementById("local-rate-image").src = `images/readsb-local_rate-${timeFrame}.png?time=${timeStamp}`;
    document.getElementById("aircraft-message-rate-image").src = `images/readsb-aircraft_message_rate-${timeFrame}.png?time=${timeStamp}`;
    document.getElementById("aircraft-image").src = `images/readsb-aircraft-${timeFrame}.png?time=${timeStamp}`;
    document.getElementById("tracks-image").src = `images/readsb-tracks-${timeFrame}.png?time=${timeStamp}`;
    document.getElementById("signal-image").src = `images/readsb-signal-${timeFrame}.png?time=${timeStamp}`;
    document.getElementById("readsb-cpu-image").src = `images/readsb-cpu-${timeFrame}.png?time=${timeStamp}`;
    document.getElementById("system-cpu-image").src = `images/system-cpu-${timeFrame}.png?time=${timeStamp}`;
    document.getElementById("system-network-bandwidth-image").src = `images/system-network_bandwidth-${timeFrame}.png?time=${timeStamp}`;
    document.getElementById("system-memory-image").src = `images/system-memory-${timeFrame}.png?time=${timeStamp}`;
    document.getElementById("system-df-root-image").src = `images/system-df_root-${timeFrame}.png?time=${timeStamp}`;
    document.getElementById("system-disk-iops-image").src = `images/system-disk_io_iops-${timeFrame}.png?time=${timeStamp}`;
    document.getElementById("system-disk-octets-image").src = `images/system-disk_io_octets-${timeFrame}.png?time=${timeStamp}`;
    switch (rangeUnit) {
        default:
        case "nautical":
            document.getElementById("range-image").src = `images/readsb-range-nautical-${timeFrame}.png?time=${timeStamp}`;
            document.getElementById("nautical-radio").checked = true;
            break;
        case "imperial":
            document.getElementById("range-image").src = `images/readsb-range-statute-${timeFrame}.png?time=${timeStamp}`;
            document.getElementById("imperial-radio").checked = true;
            break;
        case "metric":
            document.getElementById("range-image").src = `images/readsb-range-metric-${timeFrame}.png?time=${timeStamp}`;
            document.getElementById("metric-radio").checked = true;
            break;
    }
    switch (temperatureUnit) {
        default:
        case "celsius":
            document.getElementById("system-temperature-image").src = `images/system-temperature-celsius-${timeFrame}.png?time=${timeStamp}`;
            document.getElementById("celsius-radio").checked = true;
            break;
        case "fahrenheit":
            document.getElementById("system-temperature-image").src = `images/system-temperature-fahrenheit-${timeFrame}.png?time=${timeStamp}`;
            document.getElementById("fahrenheit-radio").checked = true;
            break;
    }
    for (const c of document.getElementById("navigation-bar").children) {
        c.classList.remove("active");
    }
    document.getElementById(`btn-${timeFrame}`).classList.add("active");
}
function switchRangeUnit(unit) {
    rangeUnit = unit;
    localStorage.setItem("ReadsbGraphsRangeUnit", unit);
    switchView(timeFrame);
}
function switchTemperatureUnit(unit) {
    temperatureUnit = unit;
    localStorage.setItem("ReadsbGraphsTemperatureUnit", unit);
    switchView(timeFrame);
}
//# sourceMappingURL=graphs.js.map