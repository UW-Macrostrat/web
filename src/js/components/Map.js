import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { SETTINGS } from '../Settings'
import { mapStyle } from '../MapStyle'
// import mapboxgl from 'mapbox-gl'

const LITH_CLASSES = 3
const LITH_TYPES = 14

const noFilter = [
  "all",
  ["!=", "color", ""]
]


class Map extends Component {
  constructor(props) {
    super(props)
    this.swapBasemap = this.swapBasemap.bind(this)
    this.currentSources = []
    this.isPanning = false
    this.elevationPoints = []
    this.noFilter = [
      "all",
      ["!=", "color", ""]
    ]
    this.filters = [
      "any",
    ]
  }

  componentDidMount() {
    mapboxgl.accessToken = 'pk.eyJ1IjoiamN6YXBsZXdza2kiLCJhIjoiWnQxSC01USJ9.oleZzfREJUKAK1TMeCD0bg';
    this.map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/jczaplewski/cje04mr9l3mo82spihpralr4i?optimize=true',
      //  style: SETTINGS.baseMapURL,
        center: [-89, 43],
        zoom: 7,
        maxZoom: 16,
        hash: true,
        // failIfMajorPerformanceCaveat: true,
        // dragRotate: false,
        // touchZoomRotate: false
    })
    // disable map rotation using right click + drag
    this.map.dragRotate.disable()

    // disable map rotation using touch rotation gesture
    this.map.touchZoomRotate.disableRotation()

    this.map.on('load', () => {
      Object.keys(mapStyle.sources).forEach(source => {
        this.map.addSource(source, mapStyle.sources[source])
      })

      mapStyle.layers.forEach(layer => {
        if (layer.source === 'indexMap' || layer.source === 'columns' || layer.source === 'info_marker') {
          this.map.addLayer(layer)
        } else {
          this.map.addLayer(layer, 'airport-label')
        }
      })

      this.map.setFilter('burwell_fill', noFilter)
      this.map.setFilter('burwell_stroke', noFilter)

      setTimeout(() => {
        console.log(this.map.getStyle())
        console.log(this.map.getSource('composite'))
      }, 5000)

    })

    this.map.on('movestart', () => {
      if (this.panning) {
        return
      }
      this.map.setLayoutProperty('infoMarker', 'visibility', 'none')
      this.props.closeInfoDrawer()
      this.map.setFilter('indexMap_highlight', [ '==', 'source_id', '' ])
    })

    this.map.on('click', (event) => {
      // If the elevation drawer is open and we are awaiting to points, add them
      if (this.props.elevationChartOpen && this.props.elevationData && this.props.elevationData.length === 0) {
        this.elevationPoints.push([event.lngLat.lng, event.lngLat.lat])
        this.map.getSource('elevationPoints').setData({
          type: 'FeatureCollection',
          features: this.elevationPoints.map(p => {
            return {
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: p
              }
            }
          })
        })
        if (this.elevationPoints.length === 2) {
          this.props.getElevation(this.elevationPoints)
          this.map.getSource('elevationLine').setData({
            type: 'FeatureCollection',
            features: [{
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: this.elevationPoints
              }
            }]
          })
        }
        return
      }

      if (this.props.mapHasFossils) {
        let collections = this.map.queryRenderedFeatures(event.point, { layers: ['pbdbCollections']})
        console.log('collections - ', collections)
        if (collections.length && collections[0].properties.hasOwnProperty('n_collections')) {
          this.map.zoomTo(this.map.getZoom() + 1, { center: event.lngLat })
          return
        } else if (collections.length && collections[0].properties.hasOwnProperty('collection_no')) {
          this.props.getPBDB(collections.map(col => { return col.properties.collection_no }))
          return
        }
      }

      let features = this.map.queryRenderedFeatures(event.point, { layers: ['burwell_fill', 'column_fill', 'indexMap_fill']})

      let burwellFeatures = features.filter(f => {
        if (f.layer.id === 'burwell_fill') return f
      }).map(f => {
        return f.properties
      })
      if (burwellFeatures.length) {
        this.props.queryMap(event.lngLat.lng, event.lngLat.lat, this.map.getZoom(), burwellFeatures[0].map_id)
      } else {
        this.props.queryMap(event.lngLat.lng, event.lngLat.lat, this.map.getZoom())
      }

      let indexMapFeatures = features.filter(f => {
        if (f.layer.id === 'indexMap_fill') return f
      }).sort((a, b) => {
        return a.properties.area - b.properties.area
      })

      if (indexMapFeatures.length) {
        this.map.setFilter('indexMap_highlight', [ '==', 'source_id', indexMapFeatures[0].properties.source_id ])
        this.props.setActiveIndexMap(indexMapFeatures[0].properties)
      }

      //console.log(features)

      let xOffset = (window.innerWidth > 850) ? -((window.innerWidth*0.3333)/2) : 0

      /*
      Ok. I know this looks jank, and it is, but bear with me.
      When we pan the map to center the marker relative to the side panel
      a `movestart` event is fired on the map. That same `movestart` is the
      listener we use to listen for user input and remove the marker. By
      toggling this boolean we are able to ignore the `movestart` even when it
      is fired by this particular action.
      */
      this.panning = true
      this.map.panTo(event.lngLat, {
        offset: [ xOffset, 0 ],
        easing: function easing(t) {
          return t * (2 - t)
        },
        duration: 300
      })
      setTimeout(() => {
        this.panning = false
      }, 1000)

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

    // Fired after 'swapBasemap'
    this.map.on('style.load', () => {
      if (!this.currentSources.length) {
        return
      }

      this.currentSources.forEach(source => {
        this.map.addSource(source.id, source.config)
        if (source.data) {
          this.map.getSource(source.id).setData(source.data)
        }
      })

      this.currentLayers.forEach(layer => {
        if (layer.layer.id != 'infoMarker') {
          this.map.addLayer(layer.layer, 'airport-label')
        } else {
          this.map.addLayer(layer.layer)
        }

        if (layer.filters) {
          this.map.setFilter(layer.layer.id, layer.filters)
        }
        if (layer.layer.source === 'burwell' && layer.layer.type === 'line' && layer.layer.id != 'burwell_stroke' && this.props.filters.length != 0) {
          this.map.setLayoutProperty(layer.layer.id, 'visibility', 'none')
        }
      })
    })
  }

  swapBasemap(toAdd) {
    this.currentSources = []
    this.currentLayers = []

    Object.keys(mapStyle.sources).forEach(source => {
      let isPresent = this.map.getSource(source)
      if (isPresent) {
        this.currentSources.push({
          id: source,
          config: mapStyle.sources[source],
          data: isPresent._data || null
        })
      }
    })

    mapStyle.layers.forEach(layer => {
      let isPresent = this.map.getLayer(layer.id)
      if (isPresent) {
        this.currentLayers.push({
          layer: layer,
          filters: this.map.getFilter(layer.id)
        })
      }
    })

    this.map.setStyle(toAdd)
  }


  componentWillUpdate(nextProps) {
    // Watch the state of the application and adjust the map accordingly
    if (!nextProps.elevationChartOpen && this.props.elevationChartOpen && this.map) {
      this.elevationPoints = []
      this.map.getSource('elevationPoints').setData({
        "type": "FeatureCollection",
        "features": []
      })
      this.map.getSource('elevationLine').setData({
        "type": "FeatureCollection",
        "features": []
      })
    }
    // Bedrock
    if (JSON.stringify(nextProps.mapCenter) != JSON.stringify(this.props.mapCenter)) {
      if (nextProps.mapCenter.type === 'place') {
        let bounds = [
          [ nextProps.mapCenter.place.bbox[0], nextProps.mapCenter.place.bbox[1] ],
          [ nextProps.mapCenter.place.bbox[2], nextProps.mapCenter.place.bbox[3] ]
        ]
        this.map.fitBounds(bounds, {
          duration: 0,
          maxZoom: 16
        })
      } else {
        // zoom to user location
      }
    } else if (nextProps.mapHasBedrock && !this.props.mapHasBedrock) {
      mapStyle.layers.forEach(layer => {
        if (layer.source === 'burwell') {
          this.map.setLayoutProperty(layer.id, 'visibility', 'visible')
        }
      })
    } else if (!nextProps.mapHasBedrock && this.props.mapHasBedrock) {
      mapStyle.layers.forEach(layer => {
        if (layer.source === 'burwell') {
          this.map.setLayoutProperty(layer.id, 'visibility', 'none')
        }
      })
    } else if (nextProps.mapHasSatellite != this.props.mapHasSatellite) {
      if (nextProps.mapHasSatellite) {
        this.swapBasemap(SETTINGS.satelliteMapURL)
      } else {
        this.swapBasemap(SETTINGS.baseMapURL)
      }
    } else if (nextProps.mapHasColumns != this.props.mapHasColumns) {
      if (nextProps.mapHasColumns) {
        if (this.props.filters.length) {
          this.props.getFilteredColumns()
          mapStyle.layers.forEach(layer => {
            if (layer.source === 'filteredColumns') {
              this.map.setLayoutProperty(layer.id, 'visibility', 'visible')
            }
          })

        } else {
          mapStyle.layers.forEach(layer => {
            if (layer.source === 'columns') {
              this.map.setLayoutProperty(layer.id, 'visibility', 'visible')
            }
          })
        }
      } else {
        mapStyle.layers.forEach(layer => {
          if (layer.source === 'columns' || layer.source === 'filteredColumns') {
            this.map.setLayoutProperty(layer.id, 'visibility', 'none')
          }
        })
      }
    } else if (JSON.stringify(nextProps.filteredColumns) != JSON.stringify(this.props.filteredColumns)) {
      this.map.getSource('filteredColumns').setData(nextProps.filteredColumns)

      if (this.map.getSource('columns')) {
        mapStyle.layers.forEach(layer => {
          if (layer.source === 'columns') {
            this.map.setLayoutProperty(layer.id, 'visibility', 'none')
          }
        })
        mapStyle.layers.forEach(layer => {
          if (layer.source === 'filteredColumns') {
            this.map.setLayoutProperty(layer.id, 'visibility', 'visible')
          }
        })
      }

    } else if (nextProps.mapHasIndexMap != this.props.mapHasIndexMap) {
      if (nextProps.mapHasIndexMap) {
        mapStyle.layers.forEach(layer => {
          if (layer.source === 'indexMap') {
            this.map.setLayoutProperty(layer.id, 'visibility', 'visible')
          }
        })
      } else {
        mapStyle.layers.forEach(layer => {
          if (layer.source === 'indexMap') {
            this.map.setLayoutProperty(layer.id, 'visibility', 'none')
          }
        })
      }
    } else if (nextProps.mapHasFossils != this.props.mapHasFossils) {
      if (nextProps.mapHasFossils) {
        mapStyle.layers.forEach(layer => {
          if (layer.source === 'pbdb') {
            this.map.setLayoutProperty(layer.id, 'visibility', 'visible')
          }
        })
      } else {
        mapStyle.layers.forEach(layer => {
          if (layer.source === 'pbdb') {
            this.map.setLayoutProperty(layer.id, 'visibility', 'none')
          }
        })
      }
    } else if (nextProps.filters.length != this.props.filters.length) {
      if (nextProps.filters.length === 0) {
        this.map.setFilter('burwell_fill', noFilter)
        this.map.setFilter('burwell_stroke', noFilter)

        mapStyle.layers.forEach(layer => {
          if (layer.source === 'burwell' && layer.type === 'line' && layer.id != 'burwell_stroke') {
            this.map.setLayoutProperty(layer.id, 'visibility', 'visible')
          }
        })

        // Remove filtered columns and add unfiltered columns
        if (this.props.mapHasColumns) {
          mapStyle.layers.forEach(layer => {
            if (layer.source === 'columns') {
              this.map.setLayoutProperty(layer.id, 'visibility', 'visible')
            }
          })
          mapStyle.layers.forEach(layer => {
            if (layer.source === 'filteredColumns') {
              this.map.setLayoutProperty(layer.id, 'visibility', 'none')
            }
          })
        }
        return
      }
      let existingFilters = new Set(this.props.filters.map(f => { return `${f.category}|${f.type}|${f.name}` }))
      let newFilters = new Set(nextProps.filters.map(f => { return `${f.category}|${f.type}|${f.name}` }))

      let incoming = [...new Set([...newFilters].filter(f => !existingFilters.has(f)))]
      let outgoing = [...new Set([...existingFilters].filter(f => !newFilters.has(f)))]

      // If a filter was removed...
      if (outgoing.length) {
        // Find its index in the existing filters
        let presentPosition = this.props.filters.map(f => { return `${f.category}|${f.type}|${f.name}` }).indexOf(outgoing[0])
        let appliedFilters = this.map.getFilter('burwell_fill')
        appliedFilters[2].splice((presentPosition + 1), 1)

        this.map.setFilter('burwell_fill', appliedFilters)
        this.map.setFilter('burwell_stroke', appliedFilters)
        return
      }


      let newFilterString = incoming[0].split('|')
      let filterToApply = nextProps.filters.filter(f => {
        if (f.category === newFilterString[0] && f.type === newFilterString[1] && f.name === newFilterString[2]) {
          return f
        }
      })
      if (filterToApply.length === 0) {
        console.log('no new filters to apply')
        return
      }
      filterToApply = filterToApply[0]

      let newFilter = []
      switch(filterToApply.type) {
        case 'intervals':
          newFilter.push('any')
          nextProps.filters.forEach(f => {
            newFilter.push([
              'all',
              ['>', 'best_age_bottom', filterToApply.t_age],
              ['<', 'best_age_top', filterToApply.b_age]
            ])
          })
          break

        case 'lithology_classes':
          newFilter.push('any')
          for (let i = 1; i < 14; i++) {
            newFilter.push([ '==', `lith_class${i}`, filterToApply.name ])
          }
          break
        case 'lithology_types':
          newFilter.push('any')
          for (let i = 1; i < 14; i++) {
            newFilter.push([ '==', `lith_type${i}`, filterToApply.name ])
          }
          break

        case 'lithologies':
        case 'strat_name_orphans':
        case 'strat_name_concepts':
          newFilter.push('any')
          newFilter.push([ 'in', 'legend_id', ...filterToApply.legend_ids ])
          break

      }

      // Basically if we are filtering by environments or anything else we can't filter the map with
      if (!newFilter.length) {
        return
      }

      let appliedFilters = this.map.getFilter('burwell_fill')
      if (appliedFilters.length === 2) {
        appliedFilters.push([
          'any',
          newFilter
        ])
      } else {
        appliedFilters[2].push(newFilter)
      }
      // appliedFilters.push(newFilter)

      // this.filters.push(newFilter)
      // let appliedFilters = this.noFilter
      // appliedFilters.push(this.filters)

      this.map.setFilter('burwell_fill', appliedFilters)
      this.map.setFilter('burwell_stroke', appliedFilters)

      // Hide all line features when a filter is applied
      mapStyle.layers.forEach(layer => {
        if (layer.source === 'burwell' && layer.type === 'line' && layer.id != 'burwell_stroke') {
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
