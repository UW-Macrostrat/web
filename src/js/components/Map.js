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
    this.mapLoaded = false
    this.currentSources = []
    this.isPanning = false
    this.elevationPoints = []
    this.noFilter = [
      "all",
      ["!=", "color", ""]
    ]
    this.timeFilters = []
    // Keep track of name: index values of time filters for easier removing
    this.timeFiltersIndex = {}

    this.filters = []
    this.filtersIndex = {}

    /*
    [
      "all",
      ["!=", "color", ""],
      ["any", this.timeFilters],
      ["any", this.filters]
    ]
    */
    this.maxValue = 500
    this.previousZoom = 0

    this.resMax = {
      0: 143,
      1: 143,
      2: 143,
      3: 76,
      4: 44,
      5: 44,
      6: 29,
      7: 20,
      8: 16,
      9: 16,
      10: 16,
    }
  }

  componentDidMount() {
    mapboxgl.accessToken = 'pk.eyJ1IjoiamN6YXBsZXdza2kiLCJhIjoiWnQxSC01USJ9.oleZzfREJUKAK1TMeCD0bg';
    this.map = new mapboxgl.Map({
        container: 'map',
        style: this.props.mapHasSatellite ? SETTINGS.satelliteMapURL : SETTINGS.baseMapURL,
        center: [this.props.mapXYZ.x, this.props.mapXYZ.y],
        zoom: this.props.mapXYZ.z,
        maxZoom: 16,
        maxTileCacheSize: 0,
    //    hash: true,
        // failIfMajorPerformanceCaveat: true,
        // dragRotate: false,
        // touchZoomRotate: false
    })
    // disable map rotation using right click + drag
    this.map.dragRotate.disable()

    // disable map rotation using touch rotation gesture
    this.map.touchZoomRotate.disableRotation()

    // Update the URI when the map moves
    this.map.on('moveend', () => {
      let center = this.map.getCenter()
      this.props.mapMoved({
        z: this.map.getZoom().toFixed(1),
        x: center.lng.toFixed(4),
        y: center.lat.toFixed(4),
      })
      if (this.props.mapHasFossils) {
        this.updateGrid()
      }
    })

    this.map.on('load', () => {
      Object.keys(mapStyle.sources).forEach(source => {
        this.map.addSource(source, mapStyle.sources[source])
      })

      // The initial draw of the layers
      mapStyle.layers.forEach(layer => {
        if (layer.source === 'columns' || layer.source === 'info_marker') {
          this.map.addLayer(layer)
        } else {
          this.map.addLayer(layer, 'airport-label')
        }

        // Accomodate any URI parameters
        if (layer.source === 'burwell' && layer['source-layer'] === 'units' && this.props.mapHasBedrock === false) {
          this.map.setLayoutProperty(layer.id, 'visibility', 'none')
        }
        if (layer.source === 'burwell' && layer['source-layer'] === 'lines' && this.props.mapHasLines === false) {
          this.map.setLayoutProperty(layer.id, 'visibility', 'none')
        }
        if (layer.source === 'pbdb' && this.props.mapHasFossils === true) {
          this.map.setLayoutProperty(layer.id, 'visibility', 'visible')
          this.updateGrid()
        }
        if (layer.source === 'columns' && this.props.mapHasColumns === true) {
          this.map.setLayoutProperty(layer.id, 'visibility', 'visible')
        }
      })

      // this.map.setFilter('burwell_fill', noFilter)
      // this.map.setFilter('burwell_stroke', noFilter)

      setTimeout(() => {
        this.mapLoaded = true
        this.applyFilters()
      }, 1)
    })

    this.map.on('movestart', () => {
      if (this.panning) {
        return
      }
      this.map.setLayoutProperty('infoMarker', 'visibility', 'none')
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

      // If we are viewing fossils, prioritize clicks on those
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

      // Otherwise try to query the geologic map
      let features = this.map.queryRenderedFeatures(event.point, { layers: ['burwell_fill', 'column_fill']})

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
        // if (layer.layer.source === 'burwell' && layer.layer.type === 'line' && layer.layer.id != 'burwell_stroke' && this.props.filters.length != 0) {
        //   this.map.setLayoutProperty(layer.layer.id, 'visibility', 'none')
        // }
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
    // Add bedrock
    } else if (nextProps.mapHasBedrock && !this.props.mapHasBedrock) {
      mapStyle.layers.forEach(layer => {
        if (layer.source === 'burwell' && layer['source-layer'] === 'units') {
          this.map.setLayoutProperty(layer.id, 'visibility', 'visible')
        }
      })
    // Remove bedrock
    } else if (!nextProps.mapHasBedrock && this.props.mapHasBedrock) {
      mapStyle.layers.forEach(layer => {
        if (layer.source === 'burwell' && layer['source-layer'] === 'units') {
          this.map.setLayoutProperty(layer.id, 'visibility', 'none')
        }
      })

    // Add lines
    } else if (nextProps.mapHasLines && !this.props.mapHasLines) {
      mapStyle.layers.forEach(layer => {
        if (layer.source === 'burwell' && layer['source-layer'] === 'lines') {
          this.map.setLayoutProperty(layer.id, 'visibility', 'visible')
        }
      })
    // Remove lines
    } else if (!nextProps.mapHasLines && this.props.mapHasLines) {
      mapStyle.layers.forEach(layer => {
        if (layer.source === 'burwell' && layer['source-layer'] === 'lines') {
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
        // If filters are applied
        if (this.props.filters.length) {
          this.props.getFilteredColumns()
          mapStyle.layers.forEach(layer => {
            if (layer.source === 'filteredColumns') {
              this.map.setLayoutProperty(layer.id, 'visibility', 'visible')
            }
          })
        // No filters applied
        } else {
          mapStyle.layers.forEach(layer => {
            if (layer.source === 'columns') {
              this.map.setLayoutProperty(layer.id, 'visibility', 'visible')
            }
          })
        }
      // Remove columns
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

    // Fossils
    } else if (nextProps.mapHasFossils != this.props.mapHasFossils) {
      if (nextProps.mapHasFossils) {
        mapStyle.layers.forEach(layer => {
          if (layer.source === 'pbdb') {
            this.map.setLayoutProperty(layer.id, 'visibility', 'visible')
          }
          this.updateGrid()
        })
      } else {
        mapStyle.layers.forEach(layer => {
          if (layer.source === 'pbdb') {
            this.map.setLayoutProperty(layer.id, 'visibility', 'none')
          }
        })
      }
    } else if (nextProps.filters.length != this.props.filters.length) {
      // If all filters have been removed simply reset the filter states
      if (nextProps.filters.length === 0) {
        this.filters = []
        this.filtersIndex = {}
        this.timeFilters = []
        this.timeFiltersIndex = {}
        this.applyFilters()

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
        // If it is a time interval
        if (outgoing[0].split('|')[0] === 'interval') {
          let idx = this.timeFiltersIndex[outgoing[0]]
          this.timeFilters.splice(idx, 1)
          delete this.timeFiltersIndex[outgoing[0]]

        // If it is anything else
        } else {
          this.filtersIndex[outgoing[0]].forEach(idx => {
            this.filters.splice(idx, 1)
          })
          delete this.filtersIndex[outgoing[0]]
        }

        this.applyFilters()
        return
      }


      let newFilterString = incoming[0].split('|')
      let filterToApply = nextProps.filters.filter(f => {
        if (f.category === newFilterString[0] && f.type === newFilterString[1] && f.name === newFilterString[2]) {
          return f
        }
      })
      if (filterToApply.length === 0) {
        console.log('no new filters to apply', nextProps.filters)
        return
      }
      filterToApply = filterToApply[0]

      let newFilter = []

      switch(filterToApply.type) {
        case 'intervals':
          this.timeFilters.push([
            'all',
            ['>', 'best_age_bottom', filterToApply.t_age],
            ['<', 'best_age_top', filterToApply.b_age]
          ])
          this.timeFiltersIndex[`${filterToApply.category}|${filterToApply.type}|${filterToApply.name}`] = this.timeFilters.length - 1
          break

        case 'lithology_classes':
          for (let i = 1; i < 14; i++) {
            this.filters.push([ '==', `lith_class${i}`, filterToApply.name ])

            if (this.filtersIndex[`${filterToApply.category}|${filterToApply.type}|${filterToApply.name}`]) {
              this.filtersIndex[`${filterToApply.category}|${filterToApply.type}|${filterToApply.name}`].push(this.filters.length - 1)
            } else {
              this.filtersIndex[`${filterToApply.category}|${filterToApply.type}|${filterToApply.name}`] = [ this.filters.length - 1]
            }
          }
          break
        case 'lithology_types':
          //newFilter.push('any')
          for (let i = 1; i < 14; i++) {
            this.filters.push([ '==', `lith_type${i}`, filterToApply.name ])

            if (this.filtersIndex[`${filterToApply.category}|${filterToApply.type}|${filterToApply.name}`]) {
              this.filtersIndex[`${filterToApply.category}|${filterToApply.type}|${filterToApply.name}`].push(this.filters.length - 1)
            } else {
              this.filtersIndex[`${filterToApply.category}|${filterToApply.type}|${filterToApply.name}`] = [ this.filters.length - 1]
            }
          }
          break

        case 'lithologies':
        case 'strat_name_orphans':
        case 'strat_name_concepts':
          //newFilter.push('any')
          this.filters.push([ 'in', 'legend_id', ...filterToApply.legend_ids ])
          this.filtersIndex[`${filterToApply.category}|${filterToApply.type}|${filterToApply.name}`] = [ this.filters.length - 1]
          break

      }

      // Basically if we are filtering by environments or anything else we can't filter the map with
      // if (!newFilter.length) {
      //   return
      // }

      // Update the map styles
      this.applyFilters()

      // Hide all line features when a filter is applied


    }

  }

  applyFilters() {
    console.log('applyFilters')
    // don't try and update featureState if the map is loading
    if (!this.mapLoaded) {
      console.log('No!')
      this.shouldUpdateFeatureState = true
      return
    }
    let toApply = [
      "all",
      ["!=", "color", ""],
    ]
    if (this.timeFilters.length) {
      toApply.push(["any", ...this.timeFilters])
    }
    if (this.filters.length) {
      toApply.push(["any", ...this.filters])
    }
  //  console.log('toApply', toApply)
    this.map.setFilter('burwell_fill', toApply)
    this.map.setFilter('burwell_stroke', toApply)

  }

  updateGrid() {
    let bounds = this.map.getBounds()
    let zoom = this.map.getZoom()
    fetch(`https://dev.macrostrat.org/api/v2/hex-summary?min_lng=${bounds._sw.lng}&min_lat=${bounds._sw.lat}&max_lng=${bounds._ne.lng}&max_lat=${bounds._ne.lat}&zoom=${zoom}`)
      .then(response => {
        return response.json()
      })
      .then(json => {
        let currentZoom = parseInt(this.map.getZoom())
        let mappings = json.success.data
        if (currentZoom != this.previousZoom) {
          this.previousZoom = currentZoom

          this.maxValue = this.resMax[parseInt(this.map.getZoom())]

          this.updateColors(mappings)

        } else {
          this.updateColors(mappings)
        }


      })
  }

  updateColors(data) {
    for (let i = 0; i < data.length; i++) {
      this.map.setFeatureState({
        source: 'pbdb',
        sourceLayer: 'hexgrid',
        id: data[i].hex_id
      }, {
        color: this.colorScale(parseInt(data[i].count))
      })
    }
  }

  colorScale(val) {
    let mid = this.maxValue / 2

    if (Math.abs(val - this.maxValue) <= Math.abs(val - mid)) {
      return '#5c8b66'
    } else if (Math.abs(val - mid) <= Math.abs(val - 1)) {
      return '#adc5b2'
    } else {
      return '#eef3ef'
    }
  }

  render() {
    return (
      <div className='map-holder'>
        <div id='map'></div>
      </div>
    )
  }
}


export default Map
