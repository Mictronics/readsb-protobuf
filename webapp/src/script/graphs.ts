/**
 * Set the default time frame to use when loading images when the page is first accessed.
 * Can be set to 1h, 6h, 12h, 24h, 7d, 30d, 180d or 365d.
 */
let timeFrame: string = "24h";

/**
 * Set the page refresh interval in milliseconds.
 */
const refreshInterval: number = 60000;

let rangeUnit: string = localStorage.getItem("ReadsbGraphsRangeUnit");
if (rangeUnit === null) {
    rangeUnit = "nautical";
}

let temperatureUnit: string = localStorage.getItem("ReadsbGraphsTemperatureUnit");
if (temperatureUnit === null) {
    temperatureUnit = "celsius";
}

document.addEventListener("DOMContentLoaded", () => {
    switchView(timeFrame);

    window.setInterval(() => {
        switchView(timeFrame);
    }, refreshInterval);
});

function switchView(newTimeFrame: string) {
    timeFrame = newTimeFrame;
    const timeStamp = new Date().getTime() / 1000;
    (document.getElementById("local-trailing-rate-image") as HTMLImageElement).src = `images/readsb-local_trailing_rate-${timeFrame}.png?time=${timeStamp}`;
    (document.getElementById("local-rate-image") as HTMLImageElement).src = `images/readsb-local_rate-${timeFrame}.png?time=${timeStamp}`;
    (document.getElementById("aircraft-message-rate-image") as HTMLImageElement).src = `images/readsb-aircraft_message_rate-${timeFrame}.png?time=${timeStamp}`;
    (document.getElementById("aircraft-image") as HTMLImageElement).src = `images/readsb-aircraft-${timeFrame}.png?time=${timeStamp}`;
    (document.getElementById("tracks-image") as HTMLImageElement).src = `images/readsb-tracks-${timeFrame}.png?time=${timeStamp}`;
    (document.getElementById("signal-image") as HTMLImageElement).src = `images/readsb-signal-${timeFrame}.png?time=${timeStamp}`;
    (document.getElementById("readsb-cpu-image") as HTMLImageElement).src = `images/readsb-cpu-${timeFrame}.png?time=${timeStamp}`;
    (document.getElementById("system-cpu-image") as HTMLImageElement).src = `images/system-cpu-${timeFrame}.png?time=${timeStamp}`;
    (document.getElementById("system-network-bandwidth-image") as HTMLImageElement).src = `images/system-network_bandwidth-${timeFrame}.png?time=${timeStamp}`;
    (document.getElementById("system-memory-image") as HTMLImageElement).src = `images/system-memory-${timeFrame}.png?time=${timeStamp}`;
    (document.getElementById("system-df-root-image") as HTMLImageElement).src = `images/system-df_root-${timeFrame}.png?time=${timeStamp}`;
    (document.getElementById("system-disk-iops-image") as HTMLImageElement).src = `images/system-disk_io_iops-${timeFrame}.png?time=${timeStamp}`;
    (document.getElementById("system-disk-octets-image") as HTMLImageElement).src = `images/system-disk_io_octets-${timeFrame}.png?time=${timeStamp}`;

    switch (rangeUnit) {
        default:
        case "nautical":
            (document.getElementById("range-image") as HTMLImageElement).src = `images/readsb-range-nautical-${timeFrame}.png?time=${timeStamp}`;
            (document.getElementById("nautical-radio") as HTMLInputElement).checked = true;
            break;
        case "imperial":
            (document.getElementById("range-image") as HTMLImageElement).src = `images/readsb-range-statute-${timeFrame}.png?time=${timeStamp}`;
            (document.getElementById("imperial-radio") as HTMLInputElement).checked = true;
            break;
        case "metric":
            (document.getElementById("range-image") as HTMLImageElement).src = `images/readsb-range-metric-${timeFrame}.png?time=${timeStamp}`;
            (document.getElementById("metric-radio") as HTMLInputElement).checked = true;
            break;
    }

    switch (temperatureUnit) {
        default:
        case "celsius":
            (document.getElementById("system-temperature-image") as HTMLImageElement).src = `images/system-temperature-celsius-${timeFrame}.png?time=${timeStamp}`;
            (document.getElementById("celsius-radio") as HTMLInputElement).checked = true;
            break;
        case "fahrenheit":
            (document.getElementById("system-temperature-image") as HTMLImageElement).src = `images/system-temperature-fahrenheit-${timeFrame}.png?time=${timeStamp}`;
            (document.getElementById("fahrenheit-radio") as HTMLInputElement).checked = true;
            break;
    }

    for (const c of document.getElementById("navigation-bar").children) {
        c.classList.remove("active");
    }
    document.getElementById(`btn-${timeFrame}`).classList.add("active");
}

function switchRangeUnit(unit: string) {
    rangeUnit = unit;
    localStorage.setItem("ReadsbGraphsRangeUnit", unit);
    switchView(timeFrame);
}

function switchTemperatureUnit(unit: string) {
    temperatureUnit = unit;
    localStorage.setItem("ReadsbGraphsTemperatureUnit", unit);
    switchView(timeFrame);
}
