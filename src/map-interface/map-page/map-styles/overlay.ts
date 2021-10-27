import { SETTINGS } from "../../Settings";

export const overlayStyle = {
  version: 8,
  sources: {
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
    info_marker: {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [0, 0],
            },
          },
        ],
      },
    },
    columns: {
      type: "geojson",
      generateId: true,
      data: `${SETTINGS.apiDomain}/api/v2/columns?all&format=geojson_bare`,
    },
    filteredColumns: {
      type: "geojson",
      generateId: true,
      data: {
        type: "FeatureCollection",
        features: [],
      },
    },
    elevationPoints: {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [],
      },
    },
    elevationLine: {
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
  },
  layers: [
    {
      id: "column_fill",
      type: "fill",
      source: "columns",
      paint: {
        "fill-color": "#777777",
        "fill-opacity": 0.2,
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
      id: "infoMarker",
      type: "symbol",
      source: "info_marker",
      layout: {
        "icon-size": 0.65,
        "icon-image": "pin",
        "icon-offset": [0, -28],
        visibility: "none",
        "icon-allow-overlap": true,
      },
    },
    {
      id: "elevationLine",
      type: "line",
      source: "elevationLine",
      paint: {
        "line-dasharray": [4, 2],
        "line-width": {
          stops: [
            [0, 3],
            [12, 5],
          ],
        },
        "line-color": "#ffffff",
        "line-opacity": 1,
      },
    },
    {
      id: "elevationPoint",
      type: "circle",
      source: "elevationPoints",
      paint: {
        "circle-radius": 6,
        "circle-color": "#ffffff",
        "circle-stroke-width": 1,
        "circle-stroke-color": "#333333",
      },
    },
    {
      id: "elevationMarker",
      type: "circle",
      source: "elevationMarker",
      paint: {
        "circle-radius": 8,
        "circle-color": "#4bc0c0",
        "circle-stroke-width": 2,
        "circle-stroke-color": "#dcdcdc",
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
  ],
};
