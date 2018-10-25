import { SETTINGS } from './Settings'

export const mapStyle = {
    "version": 8,
    "sources": {
        "burwell": {
            "type": "vector",
            "tiles": [
              `${SETTINGS.burwellTileDomain}/carto-slim/{z}/{x}/{y}.mvt`
            ],
            "tileSize": 512
        },
        // "pbdb": {
        //     "type": "vector",
        //     "tiles": [
        //       `${SETTINGS.burwellTileDomain}/hexgrid/{z}/{x}/{y}.mvt`
        //     ],
        //     "tileSize": 512,
        //     "maxzoom": 6,
        // },
        "pbdb-points": {
          "type": "geojson",
          "cluster": true,
          "clusterRadius": 50,
          "data": {
            "type": "FeatureCollection",
            "features": []
          }
        },
        "pbdb-clusters": {
          "type": "geojson",
          "generateId": true,
          "data": {
            "type": "FeatureCollection",
            "features": []
          }
        },
        "info_marker": {
          "type": "geojson",
          "data": {
            "type": "FeatureCollection",
            "features": [{
              "type": "Feature",
              "geometry": {
                "type": "Point",
                "coordinates": [0, 0]
              }
            }]
          }
        },
        "columns": {
          "type": "geojson",
          "generateId": true,
          "data": `${SETTINGS.apiDomain}/api/v2/columns?all&format=geojson_bare`
        },
        "filteredColumns": {
          "type": "geojson",
          "generateId": true,
          "data": {
            "type": "FeatureCollection",
            "features": []
          }
        },
        "elevationPoints": {
          "type": "geojson",
          "data": {
            "type": "FeatureCollection",
            "features": []
          }
        },
        "elevationLine": {
          "type": "geojson",
          "data": {
            "type": "FeatureCollection",
            "features": []
          }
        },
        "elevationMarker": {
          "type": "geojson",
          "data": {
            "type": "FeatureCollection",
            "features": []
          }
        },
    },
    "layers": [
        {
          "id": "burwell_fill",
          "type": "fill",
          "source": "burwell",
          "source-layer": "units",
          "filter": ["!=", "color", ""],
          "minzoom": 0,
          "maxzoom": 16,
          "paint": {
            "fill-color": {
              "property": "color",
              "type": "identity"
            },
            "fill-opacity": {
              "stops": [
                [0, 0.5],
                [12, 0.3]
              ]
            }
          }
        },
        {
          "id": "burwell_stroke",
          "type": "line",
          "source": "burwell",
          "source-layer": "units",
          "filter": ["!=", "color", ""],
          "minzoom": 0,
          "maxzoom": 16,
          "paint": {
          //  "line-color": "#777777",
            // "line-width": 0,
            "line-color": {
              "property": "color",
              "type": "identity"
            },
            "line-width": {
              "stops": [
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
                [16, 2]
              ]
            },
            "line-opacity": {
              "stops": [
                [0, 0],
                [4, 1]
              ]
            }
          }
        },
        // Hide water
        {
          "id": "burwell_water_fill",
          "type": "fill",
          "source": "burwell",
          "source-layer": "units",
          "filter": ["==", "color", ""],
          "minzoom": 0,
          "maxzoom": 16,
          "paint": {
            "fill-opacity": 0
          }
        },
        {
          "id": "burwell_water_line",
          "type": "line",
          "source": "burwell",
          "source-layer": "units",
          "filter": ["==", "color", ""],
          "minzoom": 0,
          "maxzoom": 16,
          "paint": {
            "line-opacity": 0,
            "line-width": 1
          }
        },
        // {
        //   "id": "lines",
        //   "type": "line",
        //   "source": "burwell",
        //   "source-layer": "lines",
        //   "filter": ["!in", "type", "moraine", "lineament"],
        //   "minzoom": 0,
        //   "maxzoom": 16,
        //   "layout": {
        //     "line-join": {
        //       "property": "type",
        //       "type": "categorical",
        //       "stops": [
        //         ["dike", "miter"],
        //         ["fold", "miter"],
        //         ["anticline", "miter"],
        //         ["syncline", "miter"],
        //         ["monocline", "miter"],
        //         ["moraine", "round"],
        //         ["flow", "miter"],
        //         ["sill", "miter"],
        //         ["vein", "round"],
        //         ["marker bed", "miter"],
        //         ["", "miter"],
        //       ]
        //     },
        //     // "line-cap": {
        //     //   "property": "type",
        //     //   "type": "categorical",
        //     //   "stops": [
        //     //     ["dike", "butt"],
        //     //     ["fold", "butt"],
        //     //     ["anticline", "butt"],
        //     //     ["syncline", "butt"],
        //     //     ["monocline", "butt"],
        //     //     ["moraine", "round"],
        //     //     ["flow", "butt"],
        //     //     ["sill", "butt"],
        //     //     ["vein", "round"],
        //     //     ["marker bed", "butt"],
        //     //     ["", "butt"],
        //     //   ]
        //     // },
        //   },
        //   "paint": {
        //   //  "line-color": "#000000",
        //     // "line-color": {
        //     //   "property": "type",
        //     //   "type": "categorical",
        //     //   "stops": [
        //     //     ["dike", "#FF4136"],
        //     //     ["fold", "#F012BE"],
        //     //     ["anticline", "#F012BE"],
        //     //     ["syncline", "#F012BE"],
        //     //     ["monocline", "#F012BE"],
        //     //     ["moraine", "#3498DB"],
        //     //     ["flow", "#FF4136"],
        //     //     ["sill", "#FF4136"],
        //     //     ["vein", "#FF4136"],
        //     //     ["marker bed", "#333333"],
        //     //     ["", "#000000"]
        //     //   ]
        //     // },
        //     "line-width": {
        //       "property": "type",
        //       "type": "categorical",
        //       "stops": [
        //         [{ "zoom": 0, "value": "" }, 0.3],
        //
        //         [{ "zoom": 1, "value": "" }, 0.3],
        //
        //         [{ "zoom": 2, "value": "" }, 0.3],
        //         [{ "zoom": 2, "value": "dike" }, 0.25],
        //         [{ "zoom": 2, "value": "sill" }, 0.25],
        //
        //         [{ "zoom": 3, "value": "" }, 0.6],
        //         [{ "zoom": 3, "value": "dike" }, 0.35],
        //         [{ "zoom": 3, "value": "sill" }, 0.35],
        //
        //         [{ "zoom": 4, "value": "" }, 0.55],
        //         [{ "zoom": 4, "value": "dike" }, 0.3],
        //         [{ "zoom": 4, "value": "sill" }, 0.3],
        //
        //         [{ "zoom": 5, "value": "" }, 0.6],
        //         [{ "zoom": 5, "value": "dike" }, 0.35],
        //         [{ "zoom": 5, "value": "sill" }, 0.35],
        //
        //         [{ "zoom": 6, "value": "" }, 0.45],
        //         [{ "zoom": 6, "value": "dike" }, 0.2],
        //         [{ "zoom": 6, "value": "sill" }, 0.2],
        //
        //         [{ "zoom": 7, "value": "" }, 0.4],
        //         [{ "zoom": 7, "value": "dike" }, 0.25],
        //         [{ "zoom": 7, "value": "sill" }, 0.25],
        //         [{ "zoom": 7, "value": "fold" }, 0.5],
        //         [{ "zoom": 7, "value": "anticline" }, 0.5],
        //         [{ "zoom": 7, "value": "syncline" }, 0.5],
        //         [{ "zoom": 7, "value": "monocline" }, 15],
        //
        //         [{ "zoom": 8, "value": "" }, 0.7],
        //         [{ "zoom": 8, "value": "dike" }, 0.45],
        //         [{ "zoom": 8, "value": "sill" }, 0.45],
        //         [{ "zoom": 8, "value": "fold" }, 0.8],
        //         [{ "zoom": 8, "value": "anticline" }, 0.8],
        //         [{ "zoom": 8, "value": "syncline" }, 0.8],
        //         [{ "zoom": 8, "value": "monocline" }, 0.8],
        //
        //         [{ "zoom": 9, "value": "" }, 0.8],
        //         [{ "zoom": 9, "value": "dike" }, 0.65],
        //         [{ "zoom": 9, "value": "sill" }, 0.65],
        //         [{ "zoom": 9, "value": "fold" }, 0.9],
        //         [{ "zoom": 9, "value": "anticline" }, 0.9],
        //         [{ "zoom": 9, "value": "syncline" }, 0.9],
        //         [{ "zoom": 9, "value": "monocline" }, 0.9],
        //
        //         [{ "zoom": 10, "value": "" }, 0.8],
        //         [{ "zoom": 10, "value": "dike" }, 0.55],
        //         [{ "zoom": 10, "value": "sill" }, 0.55],
        //         [{ "zoom": 10, "value": "moraine" }, 0.5],
        //         [{ "zoom": 10, "value": "vein" }, 0.5],
        //         [{ "zoom": 10, "value": "fold" }, 0.9],
        //         [{ "zoom": 10, "value": "anticline" }, 0.9],
        //         [{ "zoom": 10, "value": "syncline" }, 0.9],
        //         [{ "zoom": 10, "value": "monocline" }, 0.9],
        //
        //         [{ "zoom": 11, "value": "" }, 1.1],
        //         [{ "zoom": 11, "value": "dike" }, 0.85],
        //         [{ "zoom": 11, "value": "sill" }, 0.85],
        //         [{ "zoom": 11, "value": "moraine" }, 0.8],
        //         [{ "zoom": 11, "value": "vein" }, 0.8],
        //         [{ "zoom": 11, "value": "fold" }, 1.2],
        //         [{ "zoom": 11, "value": "anticline" }, 1.2],
        //         [{ "zoom": 11, "value": "syncline" }, 1.2],
        //         [{ "zoom": 11, "value": "monocline" }, 1.2],
        //
        //         [{ "zoom": 12, "value": "" }, 1.3],
        //         [{ "zoom": 12, "value": "dike" }, 0.9],
        //         [{ "zoom": 12, "value": "sill" }, 0.9],
        //         [{ "zoom": 12, "value": "moraine" }, 0.8],
        //         [{ "zoom": 12, "value": "vein" }, 0.8],
        //         [{ "zoom": 12, "value": "flow" }, 1.3],
        //         [{ "zoom": 12, "value": "fold" }, 1.4],
        //         [{ "zoom": 12, "value": "anticline" }, 1.4],
        //         [{ "zoom": 12, "value": "syncline" }, 1.4],
        //         [{ "zoom": 12, "value": "monocline" }, 1.4]
        //       ]
        //     },
        //     "line-width": {
        //       "stops": [
        //         [0, 0.4],
        //         [1, 0.4],
        //         [2, 0.4],
        //         [3, 0.4],
        //         [4, 0.35],
        //         [5, 0.5],
        //         [6, 0.25],
        //         [7, 0.5],
        //         [8, 1],
        //         [9, 0.5],
        //         [10, 1],
        //         [11, 1.75],
        //         [12, 2.5],
        //         [13, 3],
        //         [14, 4],
        //         [15, 5],
        //         [16, 6]
        //       ]
        //     },
        //   }
        // },
        {
          "id": "faults",
          "type": "line",
          "source": "burwell",
          "source-layer": "lines",
          "filter": ["in", "type", "fault", "normal fault", "thrust fault", "strike-slip fault", "reverse fault", "growth fault", "fault zone", "zone"],
          "minzoom": 0,
          "maxzoom": 16,
          "paint": {
            "line-color": "#000000",
            "line-width": [
              "interpolate", ["linear"], ["zoom"],
              0, ["case", ["!=", ["get", "name"], ""], 0.6, 0.3],
              1, ["case", ["!=", ["get", "name"], ""], 0.6, 0.3],
              2, ["case", ["!=", ["get", "name"], ""], 0.6, 0.3],
              3, ["case", ["!=", ["get", "name"], ""], 0.6, 0.3],
              4, ["case", ["!=", ["get", "name"], ""], 1, 0.5],
              5, ["case", ["!=", ["get", "name"], ""], 1.2, 0.6],
              6, ["case", ["!=", ["get", "name"], ""], 0.9, 0.45],
              7, ["case", ["!=", ["get", "name"], ""], 0.8, 0.4],
              8, ["case", ["!=", ["get", "name"], ""], 1.4, 0.7],
              9, ["case", ["!=", ["get", "name"], ""], 1.6, 0.8],
              10, ["case", ["!=", ["get", "name"], ""], 1.4, 0.7],
              11, ["case", ["!=", ["get", "name"], ""], 2.2, 1.1],
              12, ["case", ["!=", ["get", "name"], ""], 2.6, 1.3],
              13, ["case", ["!=", ["get", "name"], ""], 3, 1.5],
              14, ["case", ["!=", ["get", "name"], ""], 3.2, 1.6],
              15, ["case", ["!=", ["get", "name"], ""], 3.5, 1.75],
              16, ["case", ["!=", ["get", "name"], ""], 4.4, 2.2],
            ],
            "line-opacity": 1
          },
          "layout": {
            "line-join": "round",
            "line-cap": "round"
          },
        },
        {
          "id": "moraines",
          "type": "line",
          "source": "burwell",
          "source-layer": "lines",
          "filter": ["==", "type", "moraine"],
          "minzoom": 12,
          "maxzoom": 16,
          "layout": {
            "line-join": "round",
            "line-cap": "round"
          },
          "paint": {
            "line-color": "#3498DB",
            "line-dasharray": [1, 2],
            "line-width": {
              "stops": [
                [ 10, 1 ],
                [ 11, 2 ],
                [ 12, 2 ],
                [ 13, 2.5 ],
                [ 14, 3 ],
                [ 15, 3 ],
              ]
            },
            "line-opacity": {
              "stops": [
                [ 10, 0.2 ],
                [ 13, 1 ]
              ]
            }
          }
        },
        {
          "id": "eskers",
          "type": "line",
          "source": "burwell",
          "source-layer": "lines",
          "filter": ["==", "type", "esker"],
          "minzoom": 12,
          "maxzoom": 16,
          "layout": {
            "line-join": "round",
            "line-cap": "round"
          },
          "paint": {
            "line-color": "#00FFFF",
            "line-dasharray": [1, 4],
            "line-width": {
              "stops": [
                [ 10, 1 ],
                [ 11, 2 ],
                [ 12, 2 ],
                [ 13, 2.5 ],
                [ 14, 3 ],
                [ 15, 3 ],
              ]
            },
            "line-opacity": {
              "stops": [
                [ 10, 0.2 ],
                [ 13, 1 ]
              ]
            }
          }
        },
        {
          "id": "lineaments",
          "type": "line",
          "source": "burwell",
          "source-layer": "lines",
          "filter": ["==", "type", "lineament"],
          "minzoom": 0,
          "maxzoom": 16,
          "layout": {
            "line-join": "round",
            "line-cap": "round"
          },
          "paint": {
            "line-color": "#000000",
            "line-dasharray": [2, 2, 7, 2],
            "line-width": {
              "stops": [
                [ 9, 1],
                [ 10, 1 ],
                [ 11, 2 ],
                [ 12, 2 ],
                [ 13, 2.5 ],
                [ 14, 3 ],
                [ 15, 3 ],
              ]
            },
            "line-opacity": 1
          }
        },
        {
          "id": "synclines",
          "type": "line",
          "source": "burwell",
          "source-layer": "lines",
          "filter": ["==", "type", "syncline"],
          "minzoom": 0,
          "maxzoom": 16,
          "layout": {
            "line-join": "round",
            "line-cap": "round"
          },
          "paint": {
            "line-color": "#F012BE",
            "line-width": {
              "stops": [
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
                [16, 2.2]
              ]
            },
            "line-opacity": 1
          }
        },
        {
          "id": "monoclines",
          "type": "line",
          "source": "burwell",
          "source-layer": "lines",
          "filter": ["==", "type", "monocline"],
          "minzoom": 0,
          "maxzoom": 16,
          "layout": {
            "line-join": "round",
            "line-cap": "round"
          },
          "paint": {
            "line-color": "#F012BE",
            "line-width": {
              "stops": [
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
                [16, 2.2]
              ]
            },
            "line-opacity": 1
          }
        },
        {
          "id": "folds",
          "type": "line",
          "source": "burwell",
          "source-layer": "lines",
          "filter": ["==", "type", "fold"],
          "minzoom": 0,
          "maxzoom": 16,
          "layout": {
            "line-join": "round",
            "line-cap": "round"
          },
          "paint": {
            "line-color": "#F012BE",
            "line-width": {
              "stops": [
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
                [16, 2.2]
              ]
            },
            "line-opacity": 1
          }
        },
        {
          "id": "dikes",
          "type": "line",
          "source": "burwell",
          "source-layer": "lines",
          "filter": ["==", "type", "dike"],
          "minzoom": 6,
          "maxzoom": 16,
          "layout": {
            "line-join": "round",
            "line-cap": "round"
          },
          "paint": {
            "line-color": "#FF4136",
            "line-width": {
              "stops": [
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
                [16, 2.2]
              ]
            },
            "line-opacity": {
              "stops": [
                [ 6, 0.2 ],
                [ 10, 1 ]
              ]
            }
          }
        },
        {
          "id": "anticlines",
          "type": "line",
          "source": "burwell",
          "source-layer": "lines",
          "filter": ["==", "type", "anticline"],
          "minzoom": 0,
          "maxzoom": 16,
          "layout": {
            "line-join": "round",
            "line-cap": "round"
          },
          "paint": {
            "line-color": "#F012BE",
            "line-width": {
              "stops": [
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
                [16, 2.2]
              ]
            },
            "line-opacity": 1
          }
        },
        {
          "id": "flows",
          "type": "line",
          "source": "burwell",
          "source-layer": "lines",
          "filter": ["==", "type", "flow"],
          "minzoom": 0,
          "maxzoom": 16,
          "layout": {
            "line-join": "round",
            "line-cap": "round"
          },
          "paint": {
            "line-color": "#FF4136",
            "line-width": {
              "stops": [
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
                [16, 2.2]
              ]
            },
            "line-opacity": 1
          }
        },
        {
          "id": "sills",
          "type": "line",
          "source": "burwell",
          "source-layer": "lines",
          "filter": ["==", "type", "sill"],
          "minzoom": 0,
          "maxzoom": 16,
          "layout": {
            "line-join": "round",
            "line-cap": "round"
          },
          "paint": {
            "line-color": "#FF4136",
            "line-width": {
              "stops": [
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
                [16, 2.2]
              ]
            },
            "line-opacity": 1
          }
        },
        {
          "id": "veins",
          "type": "line",
          "source": "burwell",
          "source-layer": "lines",
          "filter": ["==", "type", "vein"],
          "minzoom": 0,
          "maxzoom": 16,
          "layout": {
            "line-join": "round",
            "line-cap": "round"
          },
          "paint": {
            "line-color": "#FF4136",
            "line-width": {
              "stops": [
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
                [16, 2.2]
              ]
            },
            "line-opacity": {
              "stops": [
                [ 6, 0.2 ],
                [ 10, 1 ]
              ]
            }
          }
        },
        {
          "id": "marker_beds",
          "type": "line",
          "source": "burwell",
          "source-layer": "lines",
          "filter": ["in", "type", "marker bed", "bed"],
          "minzoom": 12,
          "maxzoom": 16,
          "layout": {
            "line-join": "round",
            "line-cap": "round"
          },
          "paint": {
            "line-color": "#333333",
            "line-width": {
              "stops": [
                [10, 0.8],
                [11, 0.8],
                [12, 0.9],
                [13, 0.9],
                [14, 1.4],
                [15, 1.75],
                [16, 2.2]
              ]
            },
            "line-opacity": 1
          }
        },
        {
          "id": "craters",
          "type": "line",
          "source": "burwell",
          "source-layer": "lines",
          "filter": ["in", "type", "crater", "impact structure"],
          "minzoom": 10,
          "maxzoom": 16,
          "paint": {
            "line-dasharray": [6, 6],
            "line-color": "#000000",
            "line-width": {
              "stops": [
                [10, 0.6],
                [11, 0.6],
                [12, 0.72],
                [13, 0.72],
                [14, 1],
                [15, 1.3],
                [16, 1.8]
              ]
            },
            "line-opacity": 1
          }
        },
        {
          "id": "column_fill",
          "type": "fill",
          "source": "columns",
          "paint": {
            "fill-color": "#777777",
            "fill-opacity": 0.2
          },
          "layout": {
            "visibility": "none"
          }
        },
        {
          "id": "column_stroke",
          "type": "line",
          "source": "columns",
          "paint": {
            "line-color": "#777777",
            "line-width": {
              "stops": [
                [0, 0.2],
                [10, 1]
              ]
            }
          },
          "layout": {
            "visibility": "none"
          }
        },
        {
          "id": "filtered_column_fill",
          "type": "fill",
          "source": "filteredColumns",
          "paint": {
            "fill-color": "#777777",
            "fill-opacity": 0.2
          },
          "layout": {
            "visibility": "none"
          }
        },
        {
          "id": "filtered_column_stroke",
          "type": "line",
          "source": "filteredColumns",
          "paint": {
            "line-color": "#777777",
            "line-width": {
              "stops": [
                [0, 0.2],
                [10, 1]
              ]
            }
          },
          "layout": {
            "visibility": "none"
          }
        },
        {
          "id": "infoMarker",
          "type": "symbol",
          "source": "info_marker",
          "layout": {
            "icon-size": 0.65,
            "icon-image": "pin",
            "icon-offset": [0, -28],
            "visibility": "none",
            "icon-allow-overlap": true
          }
        },
        {
          "id": "elevationLine",
          "type": "line",
          "source": "elevationLine",
          "paint": {
            "line-dasharray": [4, 2],
            "line-width": {
              "stops": [
                [0, 3],
                [12, 5]
              ]
            },
            "line-color": "#ffffff",
            "line-opacity": 1
          }
        },
        {
          "id": "elevationPoint",
          "type": "circle",
          "source": "elevationPoints",
          "paint": {
            "circle-radius": 6,
            "circle-color": "#ffffff",
            "circle-stroke-width": 1,
            "circle-stroke-color": "#333333",
          }
        },
        {
          "id": "elevationMarker",
          "type": "circle",
          "source": "elevationMarker",
          "paint": {
            "circle-radius": 8,
            "circle-color": "#4bc0c0",
            "circle-stroke-width": 2,
            "circle-stroke-color": "#dcdcdc",
          }
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
          "id": "pbdb-points-clustered",
          "type": "circle",
          "source": "pbdb-points",
          "filter": ["has", "point_count"],
          "paint": {
            "circle-opacity": [
              "interpolate", ["linear"], ["zoom"],
              5, 0.8,
              10, 1,
            ],
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
                "#2171b5"
              ]
            ],
            "circle-radius": [
              "step",
              ["get", "point_count"],
              20,
              20,
              30,
              50,
              40
            ],
            "circle-stroke-width": [
              "case",
              ["boolean", ["feature-state", "hover"], false],
              2,
              0,
            ],
            "circle-stroke-color": "#fff",
          }
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
          "id": "pbdb-points",
          "type": "circle",
          "source": "pbdb-points",
          "filter": ["!", ["has", "point_count"]],
          "paint": {
            "circle-color": [
              "case",
              ["boolean", ["feature-state", "hover"], false],
              "#154974",
              "#2171b5"
            ],
            "circle-radius": [
              "interpolate", ["linear"], ["zoom"],
              7, 8,
              16, 20,
            ],
            "circle-stroke-width": [
              "case",
              ["boolean", ["feature-state", "hover"], false],
              2,
              1,
            ],
            "circle-stroke-color": "#ffffff",
          }
        },
        {
          "id": "pbdb-clusters",
          "type": "circle",
          "source": "pbdb-clusters",
          "paint": {
            "circle-opacity": [
              "interpolate", ["linear"], ["zoom"],
              0, 0.6,
              6, 1,
            ],
            "circle-color": [
              "case",
              ["boolean", ["feature-state", "hover"], false],
              "#154974",
              ["step",
                ["get", "noc"],
                "#bdd7e7",
                100,
                "#6baed6",
                1000,
                "#2171b5"
              ]
            ],
            "circle-radius": [
              "interpolate", ["linear"], ["zoom"],
              0, ["interpolate", ["linear"], ["get", "nco"], 0, 0, 1, 2, 1200, 12],
              3, ["interpolate", ["linear"], ["get", "nco"], 0, 0, 1, 4, 400, 18],
              6, ["interpolate", ["linear"], ["get", "nco"], 0, 0, 1, 10, 400, 50],
            ],
            "circle-stroke-width": [
              "case",
              ["boolean", ["feature-state", "hover"], false],
              2,
              0,
            ],
            "circle-stroke-color": "#fff",
          }
        },

    ]
}
