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

export function buildCrossSectionLayers(): mapboxgl.Layer[] {
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
  ];
}

export function buildOverlayLayers(): mapboxgl.Layer[] {
  // Get CSS colors from settings
  const ruleColor = getComputedStyle(document.body).getPropertyValue(
    "--panel-background-color"
  );

  const centerColor = getComputedStyle(document.body).getPropertyValue(
    "--panel-rule-color"
  );

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
