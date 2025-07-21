import { buildCrossSectionLayers } from "~/_utils/map-layers";

/** Add extra types we use in this style... */
interface SourceExt extends mapboxgl.Source {
  cluster?: boolean;
  clusterRadius?: number;
  generateId?: boolean;
  data?: any;
}

export function buildOverlayStyle() {
  return {
    version: 8,
    layers: buildOverlayLayers(),
    sources: overlaySources,
  };
}

const overlaySources: { [k: string]: SourceExt } = {
  // "pbdb": {
  //     "type": "vector",
  //     "tiles": [
  //       `${SETTINGS.burwellTileDomain}/hexgrid/{z}/{x}/{y}.mvt`
  //     ],
  //     "tileSize": 512,
  //     "maxzoom": 6,
  // },
  pbdb: {
    type: "vector",
    tiles: [
      `http://localhost:8000/pbdb/fossils/{z}/{x}/{y}`,
    ],
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

export function buildOverlayLayers(): mapboxgl.Layer[] {
  // Get CSS colors from settings
  const ruleColor = getComputedStyle(document.body).getPropertyValue(
    "--panel-background-color"
  );

  const centerColor = getComputedStyle(document.body).getPropertyValue(
    "--panel-rule-color"
  );

  const clusterThreshold = 2;

  return [
    {
      id: "column_fill",
      type: "fill",
      source: "columns",
      paint: {
        "fill-color": centerColor,
        "fill-opacity": 0.3,
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
        "line-opacity": 0.75,
        "line-width": {
          stops: [
            [0, 0.5],
            [4, 1],
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
    ...buildCrossSectionLayers(),
    {
      id: "pbdb-points",
      type: "circle",
      source: "pbdb",
      "source-layer": "default",
      filter: ['<=', ['get', 'n'], clusterThreshold],
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
      source: "pbdb",
      "source-layer": "default",
      filter: ['>', ['get', 'n'], clusterThreshold],
      paint: {
        "circle-opacity": ["interpolate", ["linear"], ["zoom"], 0, 0.6, 6, 1],
        "circle-color": [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          "#154974",
          ["step", ["get", "n"], "#bdd7e7", 100, "#6baed6", 1000, "#2171b5"],
        ],
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["zoom"],
          0,
          ["interpolate", ["linear"], ["get", "n"], 0, 0, 1, 2, 1200, 12],
          3,
          ["interpolate", ["linear"], ["get", "n"], 0, 0, 1, 4, 400, 18],
          6,
          ["interpolate", ["linear"], ["get", "n"], 0, 0, 1, 10, 400, 50],
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
    {
      id: 'cluster-count',
      type: 'symbol',
      source: 'pbdb',
      "source-layer": "default",
      filter: ['>', ['get', 'n'], clusterThreshold],
      layout: {
        'text-field': ['get', 'n'],
        'text-size': 10,
        'text-allow-overlap': true,
        'text-ignore-placement': true,
      },
      paint: {
        "text-color": "#fff"
      },
    },
  ];
}
