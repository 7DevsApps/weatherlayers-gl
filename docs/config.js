const ACCESS_TOKEN = '87zR5cusnpYPznXqUHWs'; // kamzek-weather token
const DATASETS_URL = 'https://weather-api.kamzek.com/datasets';
const DATA_URL = 'https://weather-api.kamzek.com/data';
const DEFAULT_DATASET = 'gfs/wind';

async function getDatasets() {
    const url = `${DATASETS_URL}?access_token=${ACCESS_TOKEN}`;
    return (await fetch(url)).json();
}

export function getUrl(datasets, datasetName, datetime) {
    const dataset = datasets.find(x => x.name === datasetName);
    if (!dataset) {
        return;
    }
    if (!dataset.datetimes.includes(datetime)) {
        return;
    }

    const url = `${DATA_URL}/${datasetName}/${datetime}.png?access_token=${ACCESS_TOKEN}`;
    return url;
}

function getDatetimes(datasets, datasetName) {
    const dataset = datasets.find(x => x.name === datasetName);
    if (!dataset) {
        return [];
    }

    const datetimes = dataset.datetimes;
    return datetimes;
}

function hexToRgb(hex) {
    return [
        parseInt(hex.substr(1, 2), 16),
        parseInt(hex.substr(3, 2), 16),
        parseInt(hex.substr(5, 2), 16)
    ];
}

export const colorFunctions = new Map([
    ['gfs/wind', WeatherGl.Colors.µ.extendedSinebowColor],
    ['gfs/tmp', WeatherGl.Colors.µ.segmentedColorScale([
        [(193 - 193) / (328 - 193),     [37, 4, 42]],
        [(206 - 193) / (328 - 193),     [41, 10, 130]],
        [(219 - 193) / (328 - 193),     [81, 40, 40]],
        [(233.15 - 193) / (328 - 193),  [192, 37, 149]],  // -40 C/F
        [(255.372 - 193) / (328 - 193), [70, 215, 215]],  // 0 F
        [(273.15 - 193) / (328 - 193),  [21, 84, 187]],   // 0 C
        [(275.15 - 193) / (328 - 193),  [24, 132, 14]],   // just above 0 C
        [(291 - 193) / (328 - 193),     [247, 251, 59]],
        [(298 - 193) / (328 - 193),     [235, 167, 21]],
        [(311 - 193) / (328 - 193),     [230, 71, 39]],
        [(328 - 193) / (328 - 193),     [88, 27, 67]],
    ])],
    ['gfs/rh', WeatherGl.Colors.µ.segmentedColorScale([
        [0 / 100, [230, 165, 30]],
        [25 / 100, [120, 100, 95]],
        [60 / 100, [40, 44, 92]],
        [75 / 100, [21, 13, 193]],
        [90 / 100, [75, 63, 235]],
        [100 / 100, [25, 255, 255]],
    ])],
    ['gfs/apcp', WeatherGl.Colors.µ.segmentedColorScale([
        [0 / 150, [37, 79, 92]],
        [2 / 150, [240, 248, 255]],
        [15 / 150, [51, 26, 155]],
        [50 / 150, [230, 0, 116]],
        [100 / 150, [255, 215, 0]],
        [150 / 150, [255, 215, 0]],
    ])],
    ['gfs/cape', WeatherGl.Colors.µ.segmentedColorScale([
        [0 / 5000, [5, 48, 97]],        // weak
        [500 / 5000, [33, 102, 172]],   // weak
        [1000 / 5000, [67, 147, 195]],  // weak
        [1500 / 5000, [146, 197, 222]], // moderate
        [2000 / 5000, [209, 229, 240]], // moderate
        [2500 / 5000, [247, 247, 247]], // moderate
        [3000 / 5000, [253, 219, 199]], // strong
        [3500 / 5000, [244, 165, 130]], // strong
        [4000 / 5000, [214, 96, 77]],   // strong
        [4500 / 5000, [178, 24, 43]],   // extreme
        [5000 / 5000, [103, 0, 31]],    // extreme
    ])],
    ['gfs/pwat', WeatherGl.Colors.µ.segmentedColorScale([
        [0 / 70, [230, 165, 30]],
        [10 / 70, [120, 100, 95]],
        [20 / 70, [40, 44, 92]],
        [30 / 70, [21, 13, 193]],
        [40 / 70, [75, 63, 235]],
        [60 / 70, [25, 255, 255]],
        [70 / 70, [150, 255, 255]],
    ])],
    ['gfs/cwat', WeatherGl.Colors.µ.segmentedColorScale([
        [0.0, [5, 5, 89]],
        [0.2, [170, 170, 230]],
        [1.0, [255, 255, 255]],
    ])],
    ['gfs/prmsl', WeatherGl.Colors.µ.segmentedColorScale([
        [(92000 - 92000) / (105000 - 92000), [40, 0, 0]],
        [(95000 - 92000) / (105000 - 92000), [187, 60, 31]],
        [(96500 - 92000) / (105000 - 92000), [137, 32, 30]],
        [(98000 - 92000) / (105000 - 92000), [16, 1, 43]],
        [(100500 - 92000) / (105000 - 92000), [36, 1, 93]],
        [(101300 - 92000) / (105000 - 92000), [241, 254, 18]],
        [(103000 - 92000) / (105000 - 92000), [228, 246, 223]],
        [(105000 - 92000) / (105000 - 92000), [255, 255, 255]],
    ])],
    ['gfs/aptmp', WeatherGl.Colors.µ.segmentedColorScale([
        [(236 - 236) / (332 - 236), [255, 255, 255]],
        [(241 - 236) / (332 - 236), [255, 255, 255]], // -32 C, -25 F extreme frostbite
        [(245.5 - 236) / (332 - 236), [6, 82, 255]],
        [(250 - 236) / (332 - 236), [6, 82, 255]],    // -23 C, -10 F frostbite
        [(258 - 236) / (332 - 236), [46, 131, 255]],
        [(266 - 236) / (332 - 236), [46, 131, 255]],  // -7 C, 20 F hypothermia
        [(280 - 236) / (332 - 236), [0, 0, 0]],       // 7 C, 45 F begin suckage (cold)
        [(300 - 236) / (332 - 236), [0, 0, 0]],       // 27 C, 80 F begin caution (heat)
        [(305 - 236) / (332 - 236), [247, 20, 35]],   // 32 C, 90 F extreme caution
        [(309.5 - 236) / (332 - 236), [247, 20, 35]],
        [(314 - 236) / (332 - 236), [245, 210, 5]],   // 41 C, 105 F danger
        [(320.5 - 236) / (332 - 236), [245, 210, 5]],
        [(327 - 236) / (332 - 236), [255, 255, 255]], // 54 C, 130 F extreme danger
        [(332 - 236) / (332 - 236), [255, 255, 255]],
    ])],
    ['gfswave/waves', WeatherGl.Colors.µ.segmentedColorScale([
        [0 / 25, [0, 0, 0]],
        [25 / 25, [21, 255, 255]],
    ])],
    ['gfswave/htsgw', WeatherGl.Colors.µ.segmentedColorScale([
        [0 / 15, [8, 29, 88]],
        [1 / 15, [37, 52, 148]],
        [2 / 15, [34, 94, 168]],
        [3 / 15, [29, 145, 192]],
        [4 / 15, [65, 182, 196]],
        [5 / 15, [127, 205, 187]],
        [6 / 15, [199, 233, 180]],
        [7 / 15, [237, 248, 177]],
        [8 / 15, [254, 204, 92]],
        [10 / 15, [253, 141, 60]],
        [12 / 15, [240, 59, 32]],
        [14 / 15, [189, 0, 38]],
        [15 / 15, [189, 0, 38]],
    ])],
    ['oscar/currents', WeatherGl.Colors.µ.segmentedColorScale([
        [0 / 1.5, [10, 25, 68]],
        [0.15 / 1.5, [10, 25, 250]],
        [0.4 / 1.5, [24, 255, 93]],
        [0.65 / 1.5, [255, 233, 102]],
        [1.0 / 1.5, [255, 233, 15]],
        [1.5 / 1.5, [255, 15, 15]],
    ])],
    ['ostia/analysed_sst', WeatherGl.Colors.µ.segmentedColorScale([
        [(270 - 270) / (304.65 - 270), [255, 255, 255]],
        [(271.25 - 270) / (304.65 - 270), [255, 255, 255]], // -1.9 C sea water freeze
        [(271.30 - 270) / (304.65 - 270), [15, 4, 168]],
        [(273.15 - 270) / (304.65 - 270), [15, 54, 208]], // 0 C fresh water freeze
        [(273.25 - 270) / (304.65 - 270), [15, 54, 188]],
        [(275.65 - 270) / (304.65 - 270), [15, 4, 168]], // lower boundary for cool currents
        [(281.65 - 270) / (304.65 - 270), [24, 132, 14]], // upper boundary for cool currents
        [(291.15 - 270) / (304.65 - 270), [247, 251, 59]], // lower boundary for warm currents
        [(295 - 270) / (304.65 - 270), [235, 167, 0]],
        [(299.65 - 270) / (304.65 - 270), [245, 0, 39]], // minimum needed for tropical cyclone formation
        [(303 - 270) / (304.65 - 270), [87, 17, 0]],
        [(304.65 - 270) / (304.65 - 270), [238, 0, 242]],
    ])],
    ['ostia/sst_anomaly', WeatherGl.Colors.µ.segmentedColorScale([
        [(-11.0 - -11) / (11 - -11), [255, 255, 255]],
        [(-3 - -11) / (11 - -11), [7, 252, 254]],
        [(-1.5 - -11) / (11 - -11), [66, 42, 253]],
        [(-0.75 - -11) / (11 - -11), [34, 55, 134]],
        [(0 - -11) / (11 - -11), [0, 0, 6]],
        [(0.75 - -11) / (11 - -11), [134, 55, 34]],
        [(1.5 - -11) / (11 - -11), [253, 14, 16]],
        [(3.0 - -11) / (11 - -11), [254, 252, 0]],
        [(11.0 - -11) / (11 - -11), [255, 255, 255]],
    ])],
    ['ostia/sea_ice_fraction', WeatherGl.Colors.µ.segmentedColorScale([
        // https://archimer.ifremer.fr/doc/00448/55980/57458.pdf
        [0 / 100, [0, 0, 0]],
        [5 / 100, [3, 5, 18]],
        [10 / 100, [20, 20, 43]],
        [15 / 100, [34, 33, 68]],
        [20 / 100, [40, 47, 96]],
        [25 / 100, [59, 59, 124]],
        [30 / 100, [63, 74, 150]],
        [35 / 100, [62, 93, 169]],
        [40 / 100, [63, 113, 180]],
        [45 / 100, [71, 132, 186]],
        [50 / 100, [82, 149, 192]],
        [55 / 100, [93, 166, 200]],
        [60 / 100, [117, 186, 206]],
        [65 / 100, [138, 204, 215]],
        [70 / 100, [170, 218, 224]],
        [75 / 100, [204, 234, 237]],
        [80 / 100, [233, 251, 252]],
        [100 / 100, [255, 255, 255]],
    ])],
    ['cams/co', WeatherGl.Colors.µ.segmentedColorScale([
        [0.0044e-6 / 9.4e-6, hexToRgb('#000000')], // opacity 0
        [0.44e-6 / 9.4e-6, hexToRgb('#c6bc73')],
        [4.4e-6 / 9.4e-6, hexToRgb('#e4672a')],
        [9.4e-6 / 9.4e-6, hexToRgb('#4b0c00')],
    ])],
    ['cams/so2', WeatherGl.Colors.µ.segmentedColorScale([
        [0.035e-9 / 75e-9, hexToRgb('#000000')], // opacity 0
        [3.5e-9 / 75e-9, hexToRgb('#c6bc73')],
        [35e-9 / 75e-9, hexToRgb('#e4672a')],
        [75e-9 / 75e-9, hexToRgb('#4b0c00')],
    ])],
    ['cams/no2', WeatherGl.Colors.µ.segmentedColorScale([
        [0.053e-9 / 100e-9, hexToRgb('#000000')], // opacity 0
        [5.3e-9 / 100e-9, hexToRgb('#c6bc73')],
        [53e-9 / 100e-9, hexToRgb('#e4672a')],
        [100e-9 / 100e-9, hexToRgb('#4b0c00')],
    ])],
    ['cams/pm2p5', WeatherGl.Colors.µ.segmentedColorScale([
        [0.012e-9 / 35.4e-9, hexToRgb('#000000')], // opacity 0
        [1.2e-9 / 35.4e-9, hexToRgb('#c6bc73')],
        [12e-9 / 35.4e-9, hexToRgb('#e4672a')],
        [35.4e-9 / 35.4e-9, hexToRgb('#4b0c00')],
    ])],
    ['cams/pm10', WeatherGl.Colors.µ.segmentedColorScale([
        [0.054e-9 / 154e-9, hexToRgb('#000000')], // opacity 0
        [5.4e-9 / 154e-9, hexToRgb('#c6bc73')],
        [54e-9 / 154e-9, hexToRgb('#e4672a')],
        [154e-9 / 154e-9, hexToRgb('#4b0c00')],
    ])],
    // https://github.com/d3/d3-scale-chromatic
    // Sequential
    ['d3.interpolateTurbo', d3.interpolateTurbo],
    ['d3.interpolateViridis', d3.interpolateViridis],
    ['d3.interpolateInferno', d3.interpolateInferno],
    ['d3.interpolateMagma', d3.interpolateMagma],
    ['d3.interpolatePlasma', d3.interpolatePlasma],
    ['d3.interpolateCividis', d3.interpolateCividis],
    ['d3.interpolateWarm', d3.interpolateWarm],
    ['d3.interpolateCool', d3.interpolateCool],
    ['d3.interpolateCubehelixDefault', d3.interpolateCubehelixDefault],
    ['d3.interpolateBuGn', d3.interpolateBuGn],
    ['d3.interpolateBuPu', d3.interpolateBuPu],
    ['d3.interpolateGnBu', d3.interpolateGnBu],
    ['d3.interpolateOrRd', d3.interpolateOrRd],
    ['d3.interpolatePuBuGn', d3.interpolatePuBuGn],
    ['d3.interpolatePuBu', d3.interpolatePuBu],
    ['d3.interpolatePuRd', d3.interpolatePuRd],
    ['d3.interpolateRdPu', d3.interpolateRdPu],
    ['d3.interpolateYlGnBu', d3.interpolateYlGnBu],
    ['d3.interpolateYlGn', d3.interpolateYlGn],
    ['d3.interpolateYlOrBr', d3.interpolateYlOrBr],
    ['d3.interpolateYlOrRd', d3.interpolateYlOrRd],
    // Cyclical
    ['d3.interpolateRainbow', d3.interpolateRainbow],
    ['d3.interpolateSinebow', d3.interpolateSinebow],
]);

export async function loadConfig() {
    const datasets = await getDatasets();

    const datetimes = getDatetimes(datasets, DEFAULT_DATASET);
    const meta = {
        dataset: DEFAULT_DATASET,
        datetimes: datetimes,
        datetime: datetimes[datetimes.length - 1],
        overlay: {
            colorFunction: DEFAULT_DATASET,
        },
        particles: {
            dataset: DEFAULT_DATASET,
            datetimes: datetimes,
            datetime: datetimes[datetimes.length - 1],
        },
    };

    const staticConfig = {
        overlay: {
            colorFunction: null,
            opacity: 0.2,
            colorBounds: null,
            legendWidth: 220,
            legendTicksCount: 6,
            legendValueFormat: null,
            vector: false,
        },
        particles: {
            count: 0,
            size: 2,
            color: [255, 255, 255],
            opacity: 0.25,
            speedFactor: 33 / 100,
            maxAge: 100,
            waves: false, // wave particle shape
        }
    };

    const overlayConfigs = new Map([
        ['gfs/wind', {
            imageBounds: [-128, 127],
            colorBounds: [0, 100],
            colorFunction: 'gfs/wind',
            legendTitle: 'Wind [m/s]',
            vector: true,
        }],
        ['gfs/tmp', {
            imageBounds: [193 - 273.15, 328 - 273.15],
            colorBounds: [193 - 273.15, 328 - 273.15],
            colorFunction: 'gfs/tmp',
            legendTitle: 'Temperature [°C]',
        }],
        ['gfs/rh', {
            imageBounds: [0, 100],
            colorBounds: [0, 100],
            colorFunction: 'gfs/rh',
            legendTitle: 'Relative Humidity [%]',
        }],
        ['gfs/apcp', {
            imageBounds: [0, 150],
            colorBounds: [0, 150],
            colorFunction: 'gfs/apcp',
            legendTitle: 'Next 3-hr Precipitation Accumulation [kg/m²]',
        }],
        ['gfs/cape', {
            imageBounds: [0, 5000],
            colorBounds: [0, 5000],
            colorFunction: 'gfs/cape',
            legendTitle: 'Convective Available Potential Energy [J/kg]',
        }],
        ['gfs/pwat', {
            imageBounds: [0, 70],
            colorBounds: [0, 70],
            colorFunction: 'gfs/pwat',
            legendTitle: 'Total Precipitable Water [kg/m²]',
        }],
        ['gfs/cwat', {
            imageBounds: [0, 1],
            colorBounds: [0, 1],
            colorFunction: 'gfs/cwat',
            legendTitle: 'Total Cloud Water [kg/m²]',
            legendValueDecimals: 1,
        }],
        ['gfs/prmsl', {
            imageBounds: [92000, 105000],
            colorBounds: [92000, 105000],
            colorFunction: 'gfs/prmsl',
            legendTitle: 'Mean Sea Level Pressure [hPa]',
            legendValueFormat: value => value / 100,
        }],
        ['gfs/aptmp', {
            imageBounds: [236 - 273.15, 332 - 273.15],
            colorBounds: [236 - 273.15, 332 - 273.15],
            colorFunction: 'gfs/aptmp',
            legendTitle: 'Misery (Wind Chill & Heat Index) [°C]',
        }],
        ['gfswave/waves', {
            imageBounds: [-20, 20],
            colorBounds: [0, 25],
            colorFunction: 'gfswave/waves',
            legendTitle: 'Peak Wave Period [s]',
            vector: true,
        }],
        ['gfswave/htsgw', {
            imageBounds: [0, 15],
            colorBounds: [0, 15],
            colorFunction: 'gfswave/htsgw',
            legendTitle: 'Significant Wave Height [m]',
        }],
        ['oscar/currents', {
            imageBounds: [-1, 1],
            colorBounds: [0, 1.5],
            colorFunction: 'oscar/currents',
            legendTitle: 'Currents [m/s]',
            legendValueDecimals: 1,
            vector: true,
        }],
        ['ostia/analysed_sst', {
            imageBounds: [270 - 273.15, 304.65 - 273.15],
            colorBounds: [270 - 273.15, 304.65 - 273.15],
            colorFunction: 'ostia/analysed_sst',
            legendTitle: 'Sea Surface Temperature [°C]',
        }],
        ['ostia/sst_anomaly', {
            imageBounds: [-11, 11],
            colorBounds: [-11, 11],
            colorFunction: 'ostia/sst_anomaly',
            legendTitle: 'Sea Surface Temperature Anomaly [°C]',
        }],
        ['ostia/sea_ice_fraction', {
            imageBounds: [0, 100],
            colorBounds: [0, 100],
            colorFunction: 'ostia/sea_ice_fraction',
            legendTitle: 'Sea Ice Fraction [%]',
        }],
        ['cams/co', {
            imageBounds: [0.0044e-6, 9.4e-6],
            colorBounds: [0.0044e-6, 9.4e-6],
            colorFunction: 'cams/co',
            legendTitle: 'CO [μg/m³]',
            legendValueFormat: value => value * 1000000000,
        }],
        ['cams/so2', {
            imageBounds: [0.035e-9, 75e-9],
            colorBounds: [0.035e-9, 75e-9],
            colorFunction: 'cams/so2',
            legendTitle: 'SO₂ [ppb]',
            legendValueFormat: value => value * 1000000000,
        }],
        ['cams/no2', {
            imageBounds: [0.053e-9, 100e-9],
            colorBounds: [0.053e-9, 100e-9],
            colorFunction: 'cams/no2',
            legendTitle: 'NO₂ [ppb]',
            legendValueFormat: value => value * 1000000000,
        }],
        ['cams/pm2p5', {
            imageBounds: [0.012e-9, 35.4e-9],
            colorBounds: [0.012e-9, 35.4e-9],
            colorFunction: 'cams/pm2p5',
            legendTitle: 'PM2.5 [μg/m³]',
            legendValueFormat: value => value * 1000000000,
        }],
        ['cams/pm10', {
            imageBounds: [0.054e-9, 154e-9],
            colorBounds: [0.054e-9, 154e-9],
            colorFunction: 'cams/pm10',
            legendTitle: 'PM10 [μg/m³]',
            legendValueFormat: value => value * 1000000000,
        }],
    ]);

    const particleConfigs = new Map([
        ['gfs/wind', {
            imageBounds: [-128, 127],
            count: 5000,
            speedFactor: 33 / 100,
            maxAge: 100,
        }],
        ['gfswave/waves', {
            imageBounds: [-20, 20],
            count: 5000,
            speedFactor: 33 / 612,
            maxAge: 40,
            waves: true,
        }],
        ['oscar/currents', {
            imageBounds: [-1, 1],
            count: 5000,
            speedFactor: 33 / 7,
            maxAge: 100,
        }],
    ]);

    const config = {
        datasets,
        meta,
        staticConfig,
        overlayConfigs,
        particleConfigs,
        overlay: { ...staticConfig.overlay, ...overlayConfigs.get(meta.dataset) },
        particles: { ...staticConfig.particles, ...particleConfigs.get(meta.particles.dataset) },
    };

    return config;
}

function formatDatetime(datetime) {
    const formattedDatetime = `${datetime.substr(0, 4)}/${datetime.substr(4, 2)}/${datetime.substr(6, 2)} ${datetime.substr(8, 2)}:00 UTC`;
    return formattedDatetime;
}

function getDatetimeOptions(datetimes) {
    return datetimes.map(datetime => {
        const formattedDatetime = formatDatetime(datetime);
        return { value: datetime, text: formattedDatetime };
    });
}

function updateOptions(gui, object, property, options) {
    const controller = gui.__controllers.find(x => x.object === object && x.property === property);
    const html = options.map(option => `<option value="${option.value}">${option.text}</option>`);

    controller.domElement.children[0].innerHTML = html;

    gui.updateDisplay();
}

function updateDatetimeOptions(gui, object, property, datetimes) {
    const options = getDatetimeOptions(datetimes);
    updateOptions(gui, object, property, options);
}

export function initGui(config, update, particlesEnabled = false) {
    const { datasets, meta, staticConfig, overlayConfigs, particleConfigs } = config;

    const gui = new dat.GUI();
    gui.width = 300;

    gui.add(meta, 'dataset', [...overlayConfigs.keys()]).onChange(async () => {
        // update datetime options
        meta.datetimes = getDatetimes(datasets, meta.dataset);
        updateDatetimeOptions(gui, meta, 'datetime', meta.datetimes);
        if (!meta.datetimes.includes(meta.datetime)) {
            meta.datetime = meta.datetimes[meta.datetimes.length - 1];
        }

        // update overlay config
        const overlayConfig = { ...staticConfig.overlay, ...overlayConfigs.get(meta.dataset) };
        Object.keys(overlayConfig).forEach(key => {
            config.overlay[key] = overlayConfig[key];
        });
        meta.overlay.colorFunction = overlayConfig.colorFunction;

        // update particle config
        meta.particles.dataset = particleConfigs.has(meta.dataset) ? meta.dataset : 'none';
        meta.particles.datetimes = getDatetimes(datasets, meta.particles.dataset);
        meta.particles.datetime = meta.datetime;
        if (!meta.particles.datetimes.includes(meta.particles.datetime)) {
            meta.particles.datetime = [...meta.particles.datetimes].reverse().find(x => x <= meta.datetime);
        }
        const particleConfig = { ...staticConfig.particles, ...particleConfigs.get(meta.particles.dataset) };
        Object.keys(particleConfig).forEach(key => {
            config.particles[key] = particleConfig[key];
        });

        gui.updateDisplay();
        update();
    });
    gui.add(meta, 'datetime', []).onChange(() => {
        meta.particles.datetime = meta.datetime;
        if (!meta.particles.datetimes.includes(meta.particles.datetime)) {
            meta.particles.datetime = [...meta.particles.datetimes].reverse().find(x => x <= meta.datetime);
        }

        update();
    });
    updateDatetimeOptions(gui, meta, 'datetime', meta.datetimes);

    const overlay = gui.addFolder('overlay');
    overlay.add(meta.overlay, 'colorFunction', [...colorFunctions.keys()]).onFinishChange(update);
    overlay.add(config.overlay, 'opacity', 0, 1, 0.01).onFinishChange(update);

    if (particlesEnabled) {
        const particles = gui.addFolder('particles');
        particles.add(meta.particles, 'dataset', ['none', ...particleConfigs.keys()]).onChange(async () => {
            // update particle config
            meta.particles.datetimes = getDatetimes(datasets, meta.particles.dataset);
            meta.particles.datetime = meta.datetime;
            if (!meta.particles.datetimes.includes(meta.particles.datetime)) {
                meta.particles.datetime = [...meta.particles.datetimes].reverse().find(x => x <= meta.datetime);
            }
            const particleConfig = { ...staticConfig.particles, ...particleConfigs.get(meta.particles.dataset) };
            Object.keys(particleConfig).forEach(key => {
                config.particles[key] = particleConfig[key];
            });

            gui.updateDisplay();
            update();
        });
        particles.add(config.particles, 'count', 0, 100000, 1).onFinishChange(update);
        particles.add(config.particles, 'size', 0.5, 5, 0.5);
        particles.addColor(config.particles, 'color');
        particles.add(config.particles, 'opacity', 0, 1, 0.01);
        particles.add(config.particles, 'speedFactor', 0.05, 5, 0.01);
        particles.add(config.particles, 'maxAge', 1, 255, 1);
    }

    return gui;
}