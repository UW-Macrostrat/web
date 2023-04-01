import { SETTINGS } from "../../settings";
export * from "./line-symbols";
export * from "./map-sources";
import chroma from "chroma-js";
import { intervals } from "@macrostrat/timescale";
import { mergeStyles } from "@macrostrat/mapbox-utils";

export function buildBasicStyle({
  color = "rgb(74, 242, 161)",
  inDarkMode,
  lineSourceLayer = "default",
  polygonSourceLayer = "default",
  tileURL,
}): mapboxgl.Style {
  const xRayColor = (opacity = 1, darken = 0) => {
    if (!inDarkMode) {
      return chroma(color)
        .darken(2 - darken)
        .alpha(opacity)
        .css();
    }
    return chroma(color).alpha(opacity).darken(darken).css();
  };

  return {
    version: 8,
    name: "basic",
    sources: {
      tileLayer: {
        type: "vector",
        tiles: [tileURL],
        tileSize: 512,
      },
    },
    layers: [
      {
        id: "polygons",
        type: "fill",
        source: "tileLayer",
        "source-layer": polygonSourceLayer,
        paint: {
          "fill-color": xRayColor(0.1),
          "fill-outline-color": xRayColor(0.5),
        },
      },
      {
        id: "lines",
        type: "line",
        source: "tileLayer",
        "source-layer": lineSourceLayer,
        paint: {
          "line-color": xRayColor(1, -1),
          "line-width": 1.5,
        },
      },
    ],
  };
}

export function buildXRayStyle({
  inDarkMode = false,
  lineLayer = "lines",
  polygonLayer = "units",
}): mapboxgl.Style {
  return buildBasicStyle({
    inDarkMode,
    lineSourceLayer: lineLayer,
    polygonSourceLayer: polygonLayer,
    tileURL: SETTINGS.burwellTileDomain + `/carto-slim/{z}/{x}/{y}`,
  });
}

export function applyAgeModelStyles(
  age,
  model,
  baseStyle,
  mapStyle,
  inDarkMode = false
) {
  let mapTileURL = "https://dev.macrostrat.org/tiles/carto-slim/{z}/{x}/{y}";
  if (age != null) {
    mapTileURL = `https://dev.macrostrat.org/tiles/carto-slim-rotated/{z}/{x}/{y}?model_id=${model}&t_step=${age}`;
  }

  let color = chroma("rgb(180, 180, 200)");
  let ageSpan = 4500;
  for (let interval of intervals) {
    let intAgeSpan = interval.eag - interval.lag;
    if (interval.eag > age && interval.lag < age && intAgeSpan < ageSpan) {
      color = chroma(interval.col);
    }
  }

  const newBaseStyle = {
    ...baseStyle,
    sources: {},
    layers: [],
  };

  const overlays = {
    ...mapStyle,
    //layers: mapStyle.layers.filter((l) => !l.id.startsWith("column")),
  };

  let styles = mergeStyles(
    newBaseStyle,
    {
      version: 8,
      layers: [
        {
          id: "plate-polygons",
          type: "fill",
          source: "burwell",
          "source-layer": "plates",
          paint: {
            "fill-color": inDarkMode ? "rgb(60,60,70)" : "rgb(170,170,200)",
            "fill-outline-color": inDarkMode
              ? "rgb(70, 70, 80)"
              : "rgb(150,150,150)",
          },
        },
        {
          id: "land",
          type: "fill",
          source: "burwell",
          "source-layer": "land",
          paint: {
            "fill-color": inDarkMode ? "rgb(80,80,90)" : "rgb(200,200,203)",
          },
        },
        // {
        //   id: "column_outline",
        //   type: "line",
        //   source: "burwell",
        //   "source-layer": "columns",
        //   paint: {
        //     "line-color": color.css(),
        //     "line-width": 1.5,
        //     "line-opacity": 0.8,
        //   },
        // },
      ],
    },
    overlays
  );

  styles.sources.burwell = {
    type: "vector",
    tiles: [mapTileURL],
    tileSize: 512,
  };

  return styles;
}

const overlaySources = {
  // "pbdb": {
  //     "type": "vector",
  //     "tiles": [
  //       `${SETTINGS.burwellTileDomain}/hexgrid/{z}/{x}/{y}.mvt`
  //     ],
  //     "tileSize": 512,
  //     "maxzoom": 6,
  // },
  "pbdb-points": {
    type: "geojson",
    cluster: true,
    clusterRadius: 50,
    data: {
      type: "FeatureCollection",
      features: [],
    },
  },
  "pbdb-clusters": {
    type: "geojson",
    generateId: true,
    data: {
      type: "FeatureCollection",
      features: [],
    },
  },
  columns: {
    type: "geojson",
    generateId: true,
    data: {
      type: "FeatureCollection",
      features: [],
    },
  },
  filteredColumns: {
    type: "geojson",
    generateId: true,
    data: {
      type: "FeatureCollection",
      features: [],
    },
  },
  crossSectionEndpoints: {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: [],
    },
  },
  crossSectionLine: {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: [],
    },
  },
  elevationMarker: {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: [],
    },
  },
};

export function buildOverlayLayers() {
  // Get CSS colors from settings
  const ruleColor = getComputedStyle(document.body).getPropertyValue(
    "--panel-background-color"
  );

  const centerColor = getComputedStyle(document.body).getPropertyValue(
    "--panel-rule-color"
  );

  const crossSectionPointPaint = {
    "circle-radius": {
      stops: [
        [0, 3],
        [12, 5],
      ],
    },
    "circle-color": centerColor,
    "circle-stroke-width": {
      stops: [
        [0, 2],
        [12, 4],
      ],
    },
    "circle-stroke-color": ruleColor,
  };

  return [
    {
      id: "column_fill",
      type: "fill",
      source: "columns",
      paint: {
        "fill-color": "#777777",
        "fill-opacity": 0,
      },
      layout: {
        visibility: "none",
      },
    },
    {
      id: "column_stroke",
      type: "line",
      source: "columns",
      paint: {
        "line-color": ruleColor,
        "line-opacity": 0.5,
        "line-width": {
          stops: [
            [0, 0.2],
            [4, 0.8],
            [10, 2],
          ],
        },
      },
      layout: {
        visibility: "none",
      },
    },
    {
      id: "filtered_column_fill",
      type: "fill",
      source: "filteredColumns",
      paint: {
        "fill-color": "#777777",
        "fill-opacity": 0.2,
      },
      layout: {
        visibility: "none",
      },
    },
    {
      id: "filtered_column_stroke",
      type: "line",
      source: "filteredColumns",
      paint: {
        "line-color": "#777777",
        "line-width": {
          stops: [
            [0, 0.2],
            [10, 1],
          ],
        },
      },
      layout: {
        visibility: "none",
      },
    },
    {
      id: "crossSectionLine",
      type: "line",
      source: "crossSectionLine",
      paint: {
        "line-width": {
          stops: [
            [0, 1],
            [12, 3],
          ],
        },
        "line-color": ruleColor,
        "line-opacity": 1,
      },
    },
    {
      id: "crossSectionEndpoint",
      type: "circle",
      source: "crossSectionEndpoints",
      paint: crossSectionPointPaint,
    },
    {
      id: "elevationMarker",
      type: "circle",
      source: "elevationMarker",
      paint: {
        ...crossSectionPointPaint,
        "circle-color": "#4bc0c0",
      },
    },
    // {
    //   "id": "pbdbCollections",
    //   "type": "fill",
    //   "source": "pbdb",
    //   "source-layer": "hexgrid",
    //   "layout": {
    //     "visibility": "none"
    //   },
    //   "paint": {
    //     "fill-color": ['feature-state', 'color'],
    //     "fill-color": [
    //       'case',
    //       ['==', ['feature-state', 'color'], null],
    //       'rgb(255,255,255)',
    //       ['feature-state', 'color']
    //     ],
    //     "fill-opacity": [
    //       'case',
    //       ['==', ['feature-state', 'color'], null],
    //       0,
    //       0.7
    //     ],
    //     "fill-outline-color": [
    //       'case',
    //       ['==', ['feature-state', 'color'], null],
    //       'rgb(255,255,255)',
    //       ['feature-state', 'color']
    //     ],
    //   }
    // },
    {
      id: "pbdb-points-clustered",
      type: "circle",
      source: "pbdb-points",
      filter: ["has", "point_count"],
      paint: {
        "circle-opacity": ["interpolate", ["linear"], ["zoom"], 5, 0.8, 10, 1],
        "circle-color": [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          "#154974",
          [
            "step",
            ["get", "point_count"],
            "#bdd7e7",
            20,
            "#6baed6",
            50,
            "#2171b5",
          ],
        ],
        "circle-radius": ["step", ["get", "point_count"], 20, 20, 30, 50, 40],
        "circle-stroke-width": [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          2,
          0,
        ],
        "circle-stroke-color": "#fff",
      },
    },
    // {
    //   "id": "pbdb-point-cluster-count",
    //   "type": "symbol",
    //   "source": "pbdb-points",
    //   "filter": ["has", "point_count"],
    //   "layout": {
    //     "text-field": "{point_count_abbreviated}",
    //     "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
    //     "text-size": 12,
    //     "icon-allow-overlap": true,
    //   }
    // },
    {
      id: "pbdb-points",
      type: "circle",
      source: "pbdb-points",
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-color": [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          "#154974",
          "#2171b5",
        ],
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 7, 8, 16, 20],
        "circle-stroke-width": [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          2,
          1,
        ],
        "circle-stroke-color": "#ffffff",
      },
    },
    {
      id: "pbdb-clusters",
      type: "circle",
      source: "pbdb-clusters",
      paint: {
        "circle-opacity": ["interpolate", ["linear"], ["zoom"], 0, 0.6, 6, 1],
        "circle-color": [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          "#154974",
          ["step", ["get", "noc"], "#bdd7e7", 100, "#6baed6", 1000, "#2171b5"],
        ],
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["zoom"],
          0,
          ["interpolate", ["linear"], ["get", "nco"], 0, 0, 1, 2, 1200, 12],
          3,
          ["interpolate", ["linear"], ["get", "nco"], 0, 0, 1, 4, 400, 18],
          6,
          ["interpolate", ["linear"], ["get", "nco"], 0, 0, 1, 10, 400, 50],
        ],
        "circle-stroke-width": [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          2,
          0,
        ],
        "circle-stroke-color": "#fff",
      },
    },
  ];
}

export function buildMacrostratStyle() {
  return {
    version: 8,
    sources: {
      burwell: {
        type: "vector",
        tiles: [`${SETTINGS.burwellTileDomain}/carto-slim/{z}/{x}/{y}`],
        tileSize: 512,
      },
      ...overlaySources,
    },
    layers: [
      {
        id: "burwell_fill",
        type: "fill",
        source: "burwell",
        "source-layer": "units",
        filter: ["!=", "color", ""],
        minzoom: 0,
        maxzoom: 16,
        paint: {
          "fill-color": {
            property: "color",
            type: "identity",
          },
          "fill-opacity": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            0.75,
            0.4,
          ],

          // "fill-opacity": {
          //   "stops": [
          //     [0, 0.5],
          //     [12, 0.3]
          //   ]
          // }
        },
      },
      {
        id: "burwell_stroke",
        type: "line",
        source: "burwell",
        "source-layer": "units",
        filter: ["!=", "color", ""],
        minzoom: 0,
        maxzoom: 16,
        paint: {
          //  "line-color": "#777777",
          // "line-width": 0,
          "line-color": {
            property: "color",
            type: "identity",
          },
          "line-width": {
            stops: [
              [0, 0.15],
              [1, 0.15],
              [2, 0.15],
              [3, 0.15],
              [4, 0.2],
              [5, 0.4],
              [6, 0.05],
              [7, 0.1],
              [8, 0.4],
              [9, 0.5],
              [10, 0.35],
              [11, 0.4],
              [12, 1],
              [13, 1.25],
              [14, 1.5],
              [15, 1.75],
              [16, 2],
            ],
          },
          "line-opacity": {
            stops: [
              [0, 0],
              [4, 0.2],
            ],
          },
        },
      },
      // Hide water
      {
        id: "burwell_water_fill",
        type: "fill",
        source: "burwell",
        "source-layer": "units",
        filter: ["==", "color", ""],
        minzoom: 0,
        maxzoom: 16,
        paint: {
          "fill-opacity": 0,
        },
      },
      {
        id: "burwell_water_line",
        type: "line",
        source: "burwell",
        "source-layer": "units",
        filter: ["==", "color", ""],
        minzoom: 0,
        maxzoom: 16,
        paint: {
          "line-opacity": 0,
          "line-width": 1,
        },
      },
      {
        id: "faults",
        type: "line",
        source: "burwell",
        "source-layer": "lines",
        filter: [
          "in",
          "type",
          "fault",
          "normal fault",
          "thrust fault",
          "strike-slip fault",
          "reverse fault",
          "growth fault",
          "fault zone",
          "zone",
        ],
        minzoom: 0,
        maxzoom: 16,
        paint: {
          "line-color": "#000000",
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            0,
            ["case", ["!=", ["get", "name"], ""], 0.6, 0.3],
            1,
            ["case", ["!=", ["get", "name"], ""], 0.6, 0.3],
            2,
            ["case", ["!=", ["get", "name"], ""], 0.6, 0.3],
            3,
            ["case", ["!=", ["get", "name"], ""], 0.6, 0.3],
            4,
            ["case", ["!=", ["get", "name"], ""], 1, 0.5],
            5,
            ["case", ["!=", ["get", "name"], ""], 1.2, 0.6],
            6,
            ["case", ["!=", ["get", "name"], ""], 0.9, 0.45],
            7,
            ["case", ["!=", ["get", "name"], ""], 0.8, 0.4],
            8,
            ["case", ["!=", ["get", "name"], ""], 1.4, 0.7],
            9,
            ["case", ["!=", ["get", "name"], ""], 1.6, 0.8],
            10,
            ["case", ["!=", ["get", "name"], ""], 1.4, 0.7],
            11,
            ["case", ["!=", ["get", "name"], ""], 2.2, 1.1],
            12,
            ["case", ["!=", ["get", "name"], ""], 2.6, 1.3],
            13,
            ["case", ["!=", ["get", "name"], ""], 3, 1.5],
            14,
            ["case", ["!=", ["get", "name"], ""], 3.2, 1.6],
            15,
            ["case", ["!=", ["get", "name"], ""], 3.5, 1.75],
            16,
            ["case", ["!=", ["get", "name"], ""], 4.4, 2.2],
          ],
          "line-opacity": 1,
        },
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
      },
      {
        id: "moraines",
        type: "line",
        source: "burwell",
        "source-layer": "lines",
        filter: ["==", "type", "moraine"],
        minzoom: 12,
        maxzoom: 16,
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#3498DB",
          "line-dasharray": [1, 2],
          "line-width": {
            stops: [
              [10, 1],
              [11, 2],
              [12, 2],
              [13, 2.5],
              [14, 3],
              [15, 3],
            ],
          },
          "line-opacity": {
            stops: [
              [10, 0.2],
              [13, 1],
            ],
          },
        },
      },
      {
        id: "eskers",
        type: "line",
        source: "burwell",
        "source-layer": "lines",
        filter: ["==", "type", "esker"],
        minzoom: 12,
        maxzoom: 16,
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#00FFFF",
          "line-dasharray": [1, 4],
          "line-width": {
            stops: [
              [10, 1],
              [11, 2],
              [12, 2],
              [13, 2.5],
              [14, 3],
              [15, 3],
            ],
          },
          "line-opacity": {
            stops: [
              [10, 0.2],
              [13, 1],
            ],
          },
        },
      },
      {
        id: "lineaments",
        type: "line",
        source: "burwell",
        "source-layer": "lines",
        filter: ["==", "type", "lineament"],
        minzoom: 0,
        maxzoom: 16,
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#000000",
          "line-dasharray": [2, 2, 7, 2],
          "line-width": {
            stops: [
              [9, 1],
              [10, 1],
              [11, 2],
              [12, 2],
              [13, 2.5],
              [14, 3],
              [15, 3],
            ],
          },
          "line-opacity": 1,
        },
      },
      {
        id: "synclines",
        type: "line",
        source: "burwell",
        "source-layer": "lines",
        filter: ["==", "type", "syncline"],
        minzoom: 0,
        maxzoom: 16,
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#F012BE",
          "line-width": {
            stops: [
              [0, 1],
              [7, 0.25],
              [8, 0.4],
              [9, 0.45],
              [10, 0.45],
              [11, 0.6],
              [12, 0.7],
              [13, 0.9],
              [14, 1.4],
              [15, 1.75],
              [16, 2.2],
            ],
          },
          "line-opacity": 1,
        },
      },
      {
        id: "monoclines",
        type: "line",
        source: "burwell",
        "source-layer": "lines",
        filter: ["==", "type", "monocline"],
        minzoom: 0,
        maxzoom: 16,
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#F012BE",
          "line-width": {
            stops: [
              [0, 1],
              [7, 0.25],
              [8, 0.4],
              [9, 0.45],
              [10, 0.45],
              [11, 0.6],
              [12, 0.7],
              [13, 0.9],
              [14, 1.4],
              [15, 1.75],
              [16, 2.2],
            ],
          },
          "line-opacity": 1,
        },
      },
      {
        id: "folds",
        type: "line",
        source: "burwell",
        "source-layer": "lines",
        filter: ["==", "type", "fold"],
        minzoom: 0,
        maxzoom: 16,
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#F012BE",
          "line-width": {
            stops: [
              [0, 1],
              [7, 0.25],
              [8, 0.4],
              [9, 0.45],
              [10, 0.45],
              [11, 0.6],
              [12, 0.7],
              [13, 0.9],
              [14, 1.4],
              [15, 1.75],
              [16, 2.2],
            ],
          },
          "line-opacity": 1,
        },
      },
      {
        id: "dikes",
        type: "line",
        source: "burwell",
        "source-layer": "lines",
        filter: ["==", "type", "dike"],
        minzoom: 6,
        maxzoom: 16,
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#FF4136",
          "line-width": {
            stops: [
              [0, 1],
              [7, 0.25],
              [8, 0.4],
              [9, 0.45],
              [10, 0.45],
              [11, 0.6],
              [12, 0.7],
              [13, 0.9],
              [14, 1.4],
              [15, 1.75],
              [16, 2.2],
            ],
          },
          "line-opacity": {
            stops: [
              [6, 0.2],
              [10, 1],
            ],
          },
        },
      },
      {
        id: "anticlines",
        type: "line",
        source: "burwell",
        "source-layer": "lines",
        filter: ["==", "type", "anticline"],
        minzoom: 0,
        maxzoom: 16,
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#F012BE",
          "line-width": {
            stops: [
              [0, 1],
              [7, 0.25],
              [8, 0.4],
              [9, 0.45],
              [10, 0.45],
              [11, 0.6],
              [12, 0.7],
              [13, 0.9],
              [14, 1.4],
              [15, 1.75],
              [16, 2.2],
            ],
          },
          "line-opacity": 1,
        },
      },
      {
        id: "flows",
        type: "line",
        source: "burwell",
        "source-layer": "lines",
        filter: ["==", "type", "flow"],
        minzoom: 0,
        maxzoom: 16,
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#FF4136",
          "line-width": {
            stops: [
              [0, 1],
              [7, 0.25],
              [8, 0.4],
              [9, 0.45],
              [10, 0.45],
              [11, 0.6],
              [12, 0.7],
              [13, 0.9],
              [14, 1.4],
              [15, 1.75],
              [16, 2.2],
            ],
          },
          "line-opacity": 1,
        },
      },
      {
        id: "sills",
        type: "line",
        source: "burwell",
        "source-layer": "lines",
        filter: ["==", "type", "sill"],
        minzoom: 0,
        maxzoom: 16,
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#FF4136",
          "line-width": {
            stops: [
              [0, 1],
              [7, 0.25],
              [8, 0.4],
              [9, 0.45],
              [10, 0.45],
              [11, 0.6],
              [12, 0.7],
              [13, 0.9],
              [14, 1.4],
              [15, 1.75],
              [16, 2.2],
            ],
          },
          "line-opacity": 1,
        },
      },
      {
        id: "veins",
        type: "line",
        source: "burwell",
        "source-layer": "lines",
        filter: ["==", "type", "vein"],
        minzoom: 0,
        maxzoom: 16,
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#FF4136",
          "line-width": {
            stops: [
              [0, 1],
              [7, 0.25],
              [8, 0.4],
              [9, 0.45],
              [10, 0.45],
              [11, 0.6],
              [12, 0.7],
              [13, 0.9],
              [14, 1.4],
              [15, 1.75],
              [16, 2.2],
            ],
          },
          "line-opacity": {
            stops: [
              [6, 0.2],
              [10, 1],
            ],
          },
        },
      },
      {
        id: "marker_beds",
        type: "line",
        source: "burwell",
        "source-layer": "lines",
        filter: ["in", "type", "marker bed", "bed"],
        minzoom: 12,
        maxzoom: 16,
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#333333",
          "line-width": {
            stops: [
              [10, 0.8],
              [11, 0.8],
              [12, 0.9],
              [13, 0.9],
              [14, 1.4],
              [15, 1.75],
              [16, 2.2],
            ],
          },
          "line-opacity": 1,
        },
      },
      {
        id: "craters",
        type: "line",
        source: "burwell",
        "source-layer": "lines",
        filter: ["in", "type", "crater", "impact structure"],
        minzoom: 10,
        maxzoom: 16,
        paint: {
          "line-dasharray": [6, 6],
          "line-color": "#000000",
          "line-width": {
            stops: [
              [10, 0.6],
              [11, 0.6],
              [12, 0.72],
              [13, 0.72],
              [14, 1],
              [15, 1.3],
              [16, 1.8],
            ],
          },
          "line-opacity": 1,
        },
      },
      ...buildOverlayLayers(),
    ],
  };
}
