import React, { Component } from 'react'
import { SETTINGS } from '../Settings'
import { mapStyle } from '../MapStyle'

class Map extends Component {
  constructor(props) {
    super(props)
    this.swapBasemap = this.swapBasemap.bind(this)
    this.mapLoaded = false
    this.currentSources = []
    this.isPanning = false
    this.elevationPoints = []

    // Separate time filters and other filters for different rules
    // i.e. time filters are <interval> OR <interval> and all others are AND
    this.timeFilters = []
    // Keep track of name: index values of time filters for easier removing
    this.timeFiltersIndex = {}

    this.filters = []
    this.filtersIndex = {}

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

    // We need to store these for cluster querying...
    this.pbdbPoints = {}
  }

  componentDidMount() {
    mapboxgl.accessToken = SETTINGS.mapboxAccessToken;
    this.map = new mapboxgl.Map({
        container: 'map',
        style: this.props.mapHasSatellite ? SETTINGS.satelliteMapURL : SETTINGS.baseMapURL,
        center: [this.props.mapXYZ.x, this.props.mapXYZ.y],
        zoom: this.props.mapXYZ.z,
        maxZoom: 16,
        maxTileCacheSize: 0,
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
        this.refreshPBDB()
      }
    })

    this.map.on('load', () => {
      // Add the sources to the map
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
        if ((layer.source === 'pbdb'  || layer.source === 'pbdb-points') && this.props.mapHasFossils === true) {
          this.map.setLayoutProperty(layer.id, 'visibility', 'visible')
          this.refreshPBDB()
        }
        if (layer.source === 'columns' && this.props.mapHasColumns === true) {
          this.map.setLayoutProperty(layer.id, 'visibility', 'visible')
        }
      })

      // NO idea why timeout is needed
      setTimeout(() => {
        this.mapLoaded = true
        this.applyFilters()
      }, 1)
    })

    // Hide the infoMarker when the map moves
    this.map.on('movestart', () => {
      if (this.panning) {
        return
      }
      // Make sure this doesn't fire before infoMarker is added to map
      // Can happen on a slow connection
      if (this.map.getLayer('infoMarker')) {
        this.map.setLayoutProperty('infoMarker', 'visibility', 'none')
      }
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
        let collections = this.map.queryRenderedFeatures(event.point, { layers: ['pbdbCollections','pbdb-points-clustered', 'pbdb-points']})

        // Clicked on a hex grid
        if (collections.length && collections[0].properties.hasOwnProperty('hex_id')) {
          this.map.zoomTo(this.map.getZoom() + 1, { center: event.lngLat })
          return

        // Clicked on a cluster
        } else if (collections.length && collections[0].properties.hasOwnProperty('cluster')) {
          // via https://jsfiddle.net/aznkw784/
          let pointsInCluster = this.pbdbPoints.features.filter(f => {
            let pointPixels = this.map.project(f.geometry.coordinates)
            let pixelDistance = Math.sqrt(
              Math.pow(event.point.x - pointPixels.x, 2) +
              Math.pow(event.point.y - pointPixels.y, 2)
            )
            return Math.abs(pixelDistance) <= 50
          }).map(f => {
            return f.properties.oid.replace('col:', '')
          })
          this.props.getPBDB(pointsInCluster)

        // Clicked on an unclustered point
        } else if (collections.length && collections[0].properties.hasOwnProperty('oid')) {
          this.props.getPBDB(collections.map(col => { return col.properties.oid.replace('col:', '') }))
          return
        } else {
          // Otherwise make sure that old fossil collections aren't visible
          this.props.resetPbdb()
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

      // Readd all the previous layers to the map
      this.currentLayers.forEach(layer => {
        if (layer.layer.id != 'infoMarker') {
          this.map.addLayer(layer.layer, 'airport-label')
        } else {
          this.map.addLayer(layer.layer)
        }

        if (layer.filters) {
          this.map.setFilter(layer.layer.id, layer.filters)
        }
      })
    })
  }

  // Swap between standard and satellite base layers
  swapBasemap(toAdd) {
    this.currentSources = []
    this.currentLayers = []

    // First record which layers are currently on the map
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

    // Set the style. `style.load` will be fired after to readd other layers
    this.map.setStyle(toAdd)
  }

  // Handle updates to the state of the map
  componentWillUpdate(nextProps) {
    if (!nextProps.elevationMarkerLocation.length || nextProps.elevationMarkerLocation[0] != this.props.elevationMarkerLocation[0] && nextProps.elevationMarkerLocation[1] != this.props.elevationMarkerLocation[1]) {
      if (this.map && this.map.loaded()) {
        this.map.getSource('elevationMarker').setData({
          "type": "FeatureCollection",
          "features": [{
            "type": "Feature",
            "properties": {},
            "geometry": {
              "type": "Point",
              "coordinates": nextProps.elevationMarkerLocation
            }
          }]
        })
      }

    }
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

    // Swap satellite/normal
    } else if (nextProps.mapHasSatellite != this.props.mapHasSatellite) {
      if (nextProps.mapHasSatellite) {
        this.swapBasemap(SETTINGS.satelliteMapURL)
      } else {
        this.swapBasemap(SETTINGS.baseMapURL)
      }
    // Add columns
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
          if (layer.source === 'pbdb' || layer.source === 'pbdb-points') {
            this.map.setLayoutProperty(layer.id, 'visibility', 'visible')
          }
          this.refreshPBDB()
        })
      } else {
        mapStyle.layers.forEach(layer => {
          if (layer.source === 'pbdb' || layer.source === 'pbdb-points') {
            this.map.setLayoutProperty(layer.id, 'visibility', 'none')
          }
        })
      }

    // Handle changes to map filters
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

      // Check which filters were added or removed
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
          this.filtersIndex[outgoing[0]].reverse().forEach(idx => {
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
        //console.log('no new filters to apply', nextProps.filters)
        return
      }

      filterToApply = filterToApply[0]
      let newFilter = []

      // Check which kind of filter it is
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
    console.log('toApply', toApply)
    this.map.setFilter('burwell_fill', toApply)
    this.map.setFilter('burwell_stroke', toApply)
  }

  // PBDB hexgrids and points are refreshed on every map move
  refreshPBDB() {
    let bounds = this.map.getBounds()
    let zoom = this.map.getZoom()
    if (zoom < 8) {
      // Make sure the layer is visible
      this.map.setLayoutProperty('pbdbCollections', 'visibility', 'visible')
      // Dirty way of hiding points when zooming out
      this.map.getSource('pbdb-points').setData({"type": "FeatureCollection","features": []})
      // Fetch the summary
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
    } else {
      // Hide the hexgrids
      this.map.setLayoutProperty('pbdbCollections', 'visibility', 'none')
      // Hit the PBDB API
      fetch(`${SETTINGS.pbdbDomain}/data1.2/colls/list.json?lngmin=${bounds._sw.lng}&lngmax=${bounds._ne.lng}&latmin=${bounds._sw.lat}&latmax=${bounds._ne.lat}`)
        .then(response => {
          return response.json()
        })
        .then(json => {
          // Transform it into a GeoJSON and update the underlying data
          this.pbdbPoints = {
            "type": "FeatureCollection",
            "features": json.records.map(f => {
              return {
                "type": "Feature",
                "properties": f,
                "geometry": {
                  "type": "Point",
                  "coordinates": [f.lng, f.lat]
                }
              }
            })
          }
          this.map.getSource('pbdb-points').setData(this.pbdbPoints)
        })
    }
  }

  // Update the colors of the hexgrids
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

    // Max
    if (Math.abs(val - this.maxValue) <= Math.abs(val - mid)) {
      return '#2171b5'
    // Mid
    } else if (Math.abs(val - mid) <= Math.abs(val - 1)) {
      return '#6baed6'
    // Min
    } else {
      return '#bdd7e7'
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
