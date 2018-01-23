import React, { Component } from 'react'
import PropTypes from 'prop-types'
// import mapboxgl from 'mapbox-gl'

let config = {
    "version": 8,
    "sources": {
        "burwell": {
            "type": "vector",
              "tiles": ["https://devtiles.macrostrat.org/carto/{z}/{x}/{y}.mvt"],
              "tileSize": 512
        },
        "info_marker": {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: []
          }
        }
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
            "fill-opacity": 0.7
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
            "line-color": "#777777",
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
                [16, 2],
                [17, 2.25],
                [18, 2.5]
              ]
            },
            "line-opacity": {
              "stops": [
                [0, 0],
                [4, 0.5]
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
        {
          "id": "moraines",
          "type": "line",
          "source": "burwell",
          "source-layer": "lines",
          "filter": ["==", "type", "moraine"],
          "minzoom": 0,
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
        },{
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
            "line-opacity": 1
          }
        },
        {
          "id": "marker_beds",
          "type": "line",
          "source": "burwell",
          "source-layer": "lines",
          "filter": ["==", "type", "marker bed"],
          "minzoom": 0,
          "maxzoom": 16,
          "layout": {
            "line-join": "round",
            "line-cap": "round"
          },
          "paint": {
            "line-color": "#333333",
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
          "id": "lines",
          "type": "line",
          "source": "burwell",
          "source-layer": "lines",
          "filter": ["!in", "type", "moraine", "lineament"],
          "minzoom": 0,
          "maxzoom": 16,
          "layout": {
            "line-join": {
              "property": "type",
              "type": "categorical",
              "stops": [
                ["dike", "miter"],
                ["fold", "miter"],
                ["anticline", "miter"],
                ["syncline", "miter"],
                ["monocline", "miter"],
                ["moraine", "round"],
                ["flow", "miter"],
                ["sill", "miter"],
                ["vein", "round"],
                ["marker bed", "miter"],
                ["", "miter"],
              ]
            },
            // "line-cap": {
            //   "property": "type",
            //   "type": "categorical",
            //   "stops": [
            //     ["dike", "butt"],
            //     ["fold", "butt"],
            //     ["anticline", "butt"],
            //     ["syncline", "butt"],
            //     ["monocline", "butt"],
            //     ["moraine", "round"],
            //     ["flow", "butt"],
            //     ["sill", "butt"],
            //     ["vein", "round"],
            //     ["marker bed", "butt"],
            //     ["", "butt"],
            //   ]
            // },
          },
          "paint": {
          //  "line-color": "#000000",
            "line-color": {
              "property": "type",
              "type": "categorical",
              "stops": [
                ["dike", "#FF4136"],
                ["fold", "#F012BE"],
                ["anticline", "#F012BE"],
                ["syncline", "#F012BE"],
                ["monocline", "#F012BE"],
                ["moraine", "#3498DB"],
                ["flow", "#FF4136"],
                ["sill", "#FF4136"],
                ["vein", "#FF4136"],
                ["marker bed", "#333333"],
                ["", "#000000"]
              ]
            },
            "line-width": {
              "property": "type",
              "type": "categorical",
              "stops": [
                [{ "zoom": 0, "value": "" }, 0.3],

                [{ "zoom": 1, "value": "" }, 0.3],

                [{ "zoom": 2, "value": "" }, 0.3],
                [{ "zoom": 2, "value": "dike" }, 0.25],
                [{ "zoom": 2, "value": "sill" }, 0.25],

                [{ "zoom": 3, "value": "" }, 0.6],
                [{ "zoom": 3, "value": "dike" }, 0.35],
                [{ "zoom": 3, "value": "sill" }, 0.35],

                [{ "zoom": 4, "value": "" }, 0.55],
                [{ "zoom": 4, "value": "dike" }, 0.3],
                [{ "zoom": 4, "value": "sill" }, 0.3],

                [{ "zoom": 5, "value": "" }, 0.6],
                [{ "zoom": 5, "value": "dike" }, 0.35],
                [{ "zoom": 5, "value": "sill" }, 0.35],

                [{ "zoom": 6, "value": "" }, 0.45],
                [{ "zoom": 6, "value": "dike" }, 0.2],
                [{ "zoom": 6, "value": "sill" }, 0.2],

                [{ "zoom": 7, "value": "" }, 0.4],
                [{ "zoom": 7, "value": "dike" }, 0.25],
                [{ "zoom": 7, "value": "sill" }, 0.25],
                [{ "zoom": 7, "value": "fold" }, 0.5],
                [{ "zoom": 7, "value": "anticline" }, 0.5],
                [{ "zoom": 7, "value": "syncline" }, 0.5],
                [{ "zoom": 7, "value": "monocline" }, 15],

                [{ "zoom": 8, "value": "" }, 0.7],
                [{ "zoom": 8, "value": "dike" }, 0.45],
                [{ "zoom": 8, "value": "sill" }, 0.45],
                [{ "zoom": 8, "value": "fold" }, 0.8],
                [{ "zoom": 8, "value": "anticline" }, 0.8],
                [{ "zoom": 8, "value": "syncline" }, 0.8],
                [{ "zoom": 8, "value": "monocline" }, 0.8],

                [{ "zoom": 9, "value": "" }, 0.8],
                [{ "zoom": 9, "value": "dike" }, 0.65],
                [{ "zoom": 9, "value": "sill" }, 0.65],
                [{ "zoom": 9, "value": "fold" }, 0.9],
                [{ "zoom": 9, "value": "anticline" }, 0.9],
                [{ "zoom": 9, "value": "syncline" }, 0.9],
                [{ "zoom": 9, "value": "monocline" }, 0.9],

                [{ "zoom": 10, "value": "" }, 0.8],
                [{ "zoom": 10, "value": "dike" }, 0.55],
                [{ "zoom": 10, "value": "sill" }, 0.55],
                [{ "zoom": 10, "value": "moraine" }, 0.5],
                [{ "zoom": 10, "value": "vein" }, 0.5],
                [{ "zoom": 10, "value": "fold" }, 0.9],
                [{ "zoom": 10, "value": "anticline" }, 0.9],
                [{ "zoom": 10, "value": "syncline" }, 0.9],
                [{ "zoom": 10, "value": "monocline" }, 0.9],

                [{ "zoom": 11, "value": "" }, 1.1],
                [{ "zoom": 11, "value": "dike" }, 0.85],
                [{ "zoom": 11, "value": "sill" }, 0.85],
                [{ "zoom": 11, "value": "moraine" }, 0.8],
                [{ "zoom": 11, "value": "vein" }, 0.8],
                [{ "zoom": 11, "value": "fold" }, 1.2],
                [{ "zoom": 11, "value": "anticline" }, 1.2],
                [{ "zoom": 11, "value": "syncline" }, 1.2],
                [{ "zoom": 11, "value": "monocline" }, 1.2],

                [{ "zoom": 12, "value": "" }, 1.3],
                [{ "zoom": 12, "value": "dike" }, 0.9],
                [{ "zoom": 12, "value": "sill" }, 0.9],
                [{ "zoom": 12, "value": "moraine" }, 0.8],
                [{ "zoom": 12, "value": "vein" }, 0.8],
                [{ "zoom": 12, "value": "flow" }, 1.3],
                [{ "zoom": 12, "value": "fold" }, 1.4],
                [{ "zoom": 12, "value": "anticline" }, 1.4],
                [{ "zoom": 12, "value": "syncline" }, 1.4],
                [{ "zoom": 12, "value": "monocline" }, 1.4]
              ]
            },
            "line-width": {
              "stops": [
                [0, 0.4],
                [1, 0.4],
                [2, 0.4],
                [3, 0.4],
                [4, 0.35],
                [5, 0.5],
                [6, 0.25],
                [7, 0.5],
                [8, 1],
                [9, 0.5],
                [10, 1],
                [11, 1.75],
                [12, 2.5],
                [13, 3],
                [14, 4],
                [15, 5],
                [16, 6]
              ]
            },
          }
        },
        {
          "id": "infoMarker",
          "type": "symbol",
          "source": "info_marker",
          "layout": {
            "icon-size": 0.65,
            "icon-image": "pin",
            "icon-offset": [0, -28]
          }
        },
    ]
}

class Map extends Component {
  constructor(props) {
    super(props)
  }

  componentDidMount() {
    mapboxgl.accessToken = 'pk.eyJ1IjoiamN6YXBsZXdza2kiLCJhIjoiWnQxSC01USJ9.oleZzfREJUKAK1TMeCD0bg';
    this.map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/jczaplewski/cj7qmi00vd4id2rp9d5cnbeqj?optimize=true',
        center: [-89, 43],
        zoom: 7,
        maxZoom: 15,
        hash: true,
        failIfMajorPerformanceCaveat: true,
        dragRotate: false,
        touchZoomRotate: false
    })

    this.map.on('load', () => {
      Object.keys(config.sources).forEach(source => {
        this.map.addSource(source, config.sources[source])
      })

      config.layers.forEach(layer => {
        this.map.addLayer(layer, 'airport-label')
      })
    })

    this.map.on('movestart', () => {
      this.map.setLayoutProperty('infoMarker', 'visibility', 'none')
    })

    this.map.on('click', (event) => {
      this.props.queryMap(event.lngLat.lng, event.lngLat.lat, this.map.getZoom())

      // Update the location of the marker
      this.map.getSource('info_marker').setData({
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [event.lngLat.lng, event.lngLat.lat]
            }
          }]
        })

        this.map.setLayoutProperty('infoMarker', 'visibility', 'visible')
    })
  }

  componentWillUpdate(nextProps) {
    // Watch the state of the application and adjust the map accordingly

    // Bedrock
    if (nextProps.mapHasBedrock && !this.props.mapHasBedrock) {
      config.layers.forEach(layer => {
        if (layer.source === 'burwell') {
          this.map.setLayoutProperty(layer.id, 'visibility', 'visible')
        }
      })
    } else if (!nextProps.mapHasBedrock && this.props.mapHasBedrock) {
      config.layers.forEach(layer => {
        if (layer.source === 'burwell') {
          this.map.setLayoutProperty(layer.id, 'visibility', 'none')
        }
      })
    }

  }
  render() {
    return (
      <div>
        <div id='map'></div>
      </div>
    )
  }
}

// Map.propTypes = {
//   onClick: PropTypes.func.isRequired,
//   msg: PropTypes.string.isRequired,
//   clicks: PropTypes.number.isRequired
// }

export default Map
