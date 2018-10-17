import fetch from 'isomorphic-fetch'
import axios from 'axios'
import { addCommas } from '../utils'
import { SETTINGS } from '../Settings'

// Define constants to be passed with actions
export const PAGE_CLICK = 'PAGE_CLICK'
export const RECIEVE_DATA = 'RECIEVE_DATA'
export const REQUEST_DATA = 'REQUEST_DATA'

export const TOGGLE_MENU = 'TOGGLE_MENU'
export const TOGGLE_ABOUT = 'TOGGLE_ABOUT'
export const TOGGLE_INFODRAWER = 'TOGGLE_INFODRAWER'
export const EXPAND_INFODRAWER = 'EXPAND_INFODRAWER'
export const CLOSE_INFODRAWER = 'CLOSE_INFODRAWER'
export const TOGGLE_ELEVATION_CHART = 'TOGGLE_ELEVATION_CHART'

export const TOGGLE_FILTERS = 'TOGGLE_FILTERS'
export const ADD_FILTER = 'ADD_FILTER'
export const REMOVE_FILTER = 'REMOVE_FILTER'
export const UPDATE_COLUMN_FILTERS = 'UPDATE_COLUMN_FILTERS'

export const START_MAP_QUERY = 'START_MAP_QUERY'
export const RECEIVED_MAP_QUERY = 'RECEIVED_MAP_QUERY'

export const START_COLUMN_QUERY = 'START_COLUMN_QUERY'
export const RECEIVED_COLUMN_QUERY = 'RECEIVED_COLUMN_QUERY'

export const START_GDD_QUERY = 'START_GDD_QUERY'
export const RECEIVED_GDD_QUERY = 'RECEIVED_GDD_QUERY'

export const START_PBDB_QUERY = 'START_PBDB_QUERY'
export const UPDATE_PBDB_QUERY = 'UPDATE_PBDB_QUERY'
export const RECEIVED_PBDB_QUERY = 'RECEIVED_PBDB_QUERY'

export const TOGGLE_BEDROCK = 'TOGGLE_BEDROCK'
export const TOGGLE_LINES = 'TOGGLE_LINES'
export const TOGGLE_SATELLITE = 'TOGGLE_SATELLITE'
export const TOGGLE_COLUMNS = 'TOGGLE_COLUMNS'
export const TOGGLE_FOSSILS = 'TOGGLE_FOSSILS'

export const START_SEARCH_QUERY = 'START_SEARCH_QUERY'
export const RECEIVED_SEARCH_QUERY = 'RECEIVED_SEARCH_QUERY'
export const GO_TO_PLACE = 'GO_TO_PLACE'

export const START_ELEVATION_QUERY = 'START_ELEVATION_QUERY'
export const RECEIVED_ELEVATION_QUERY = 'RECEIVED_ELEVATION_QUERY'

export const SET_ACTIVE_INDEX_MAP = 'SET_ACTIVE_INDEX_MAP'

export const MAP_MOVED = 'MAP_MOVED'
export const GET_INITIAL_MAP_STATE = 'GET_INITIAL_MAP_STATE'
export const GOT_INITIAL_MAP_STATE = 'GOT_INITIAL_MAP_STATE'

// Define action functions
export const toggleMenu = () => {
  return {
    type: TOGGLE_MENU
  }
}
export const toggleAbout = () => {
  return {
    type: TOGGLE_ABOUT
  }
}
export const toggleInfoDrawer = () => {
  return {
    type: TOGGLE_INFODRAWER
  }
}
export const closeInfoDrawer = () => {
  return {
    type: CLOSE_INFODRAWER
  }
}
export const expandInfoDrawer = () => {
  return {
    type: EXPAND_INFODRAWER
  }
}
export const toggleFilters = () => {
  return {
    type: TOGGLE_FILTERS
  }
}

export const toggleBedrock = () => {
  return {
    type: TOGGLE_BEDROCK
  }
}

export const toggleLines = () => {
  return {
    type: TOGGLE_LINES
  }
}

export const toggleElevationChart = () => {
  return {
    type: TOGGLE_ELEVATION_CHART
  }
}

export const toggleSatellite = () => {
  return {
    type: TOGGLE_SATELLITE
  }
}
export const toggleColumns = () => {
  return {
    type: TOGGLE_COLUMNS
  }
}

export const toggleFossils = () => {
  return {
    type: TOGGLE_FOSSILS
  }
}

export function requestData() {
  return {
    type: REQUEST_DATA
  }
}

export function recieveData(json) {
  return {
    type: RECIEVE_DATA,
    data: json
  }
}

function formatResponse(data) {
  return data.map(d => {
    return d
  })
}

export function startMapQuery(data, cancelToken) {
  return {
    type: START_MAP_QUERY,
    lng: data.lng,
    lat: data.lat,
    cancelToken: cancelToken
  }
}

export function receivedMapQuery(data) {
  return {
    type: RECEIVED_MAP_QUERY,
    data: data
  }
}

function addMapIdToRef(data) {
  data.success.data.mapData = data.success.data.mapData.map(source => {
    source.ref.map_id = source.map_id
    return source
  })
  return data
}

export const queryMap = (lng, lat, z, map_id) => {
  return (dispatch) => {
    let CancelToken = axios.CancelToken
    let source = CancelToken.source()

    dispatch(startMapQuery({lng: lng, lat: lat}, source))
    let url = `${SETTINGS.apiDomain}/api/v2/mobile/map_query_v2?lng=${lng.toFixed(5)}&lat=${lat.toFixed(5)}&z=${parseInt(z)}`
    if (map_id) {
      url += `&map_id=${map_id}`
    }
    return axios.get(url, {
      cancelToken: source.token,
      responseType: 'json'
    })
    .then(json => addMapIdToRef(json.data))
    .then(json => {
      if (json.success.data && json.success.data.hasColumns) {
        dispatch(getColumn())
      }
      return json
    })
    // .then(json => shouldFetchColumn(json))
    .then(json => dispatch(receivedMapQuery(json.success.data)))

    .catch(error => {
      // don't care 💁
    })
  }
}

export function shouldFetchColumn(data) {
  console.log('shouldFetchColumn?')
  if (data.success.data && data.success.data.hasColumns) {
    getColumn()
  }
  return data
}

export function startSearchQuery(term, cancelToken) {
  return {
    type: START_SEARCH_QUERY,
    term: term,
    cancelToken: cancelToken
  }
}

export const doSearch = (term) => {
  return (dispatch) => {
    let CancelToken = axios.CancelToken
    let source = CancelToken.source()

    dispatch(startSearchQuery(term, source))

    return axios.get(`${SETTINGS.apiDomain}/api/v2/mobile/autocomplete?include=interval,lithology,environ,strat_name&query=${term}`, {
      cancelToken: source.token,
      responseType: 'json'
    })
      .then(json => dispatch(receivedSearchQuery(json.data.success.data)))
      .catch(error => {
        // don't care 💁
      })
  }
}

export function receivedSearchQuery(data) {
  return {
    type: RECEIVED_SEARCH_QUERY,
    data: data
  }
}

export function addFilter(theFilter) {
  return (dispatch, getState) => {
      let { mapHasColumns, filters } = getState().update

      switch(theFilter.type) {
        case 'place':
            dispatch({
              type: GO_TO_PLACE,
              place: theFilter
            })
            break

        case 'strat_name_concepts':
            axios.get(`${SETTINGS.apiDomain}/api/v2/defs/strat_name_concepts?concept_id=${theFilter.id}`, {
              responseType: 'json'
            })
            .then(j => {
              let f = j.data.success.data[0]

              axios.get(`${SETTINGS.apiDomain}/api/v2/mobile/map_filter?concept_id=${theFilter.id}`, {
                responseType: 'json'
              })
              .then(json => {
                dispatch({
                  type: ADD_FILTER,
                  filter: {
                    category: 'strat_name',
                    id: theFilter.id,
                    type: 'strat_name_concepts',
                    name: f.name,
                    legend_ids: json.data
                  }
                })
              })

            })


          break

        case 'strat_name_orphans':
            axios.get(`${SETTINGS.apiDomain}/api/v2/defs/strat_names?strat_name_id=${theFilter.id}`, {
              responseType: 'json'
            })
            .then(j => {
              let f = j.data.success.data[0]
              axios.get(`${SETTINGS.apiDomain}/api/v2/mobile/map_filter?strat_name_id=${theFilter.id}`, {
                responseType: 'json'
              })
              .then(json => {
                dispatch({
                  type: ADD_FILTER,
                  filter: {
                    category: 'strat_name',
                    id: theFilter.id,
                    type: 'strat_name_orphans',
                    name: f.strat_name_long,
                    legend_ids: json.data
                  }
                })
              })

            })

          break

        case 'intervals':
            axios.get(`${SETTINGS.apiDomain}/api/v2/defs/intervals?int_id=${theFilter.id}`, {
              responseType: 'json'
            })
            .then(json => {
              let f = json.data.success.data[0]
              f.name = f.name
              f.type = 'intervals'
              f.category = 'interval'
              f.id = theFilter.id

              dispatch({
                type: ADD_FILTER,
                filter: f
              })
            })
            .catch(error => {
              // don't care 💁
            })
            break

        case 'lithology_classes':
        case 'lithology_types':
          // for some reason when loading from the uri this tiny timeout is required
          setTimeout(() => {
            dispatch({
              type: ADD_FILTER,
              filter: {
                category: 'lithology',
                id: 0,
                name: theFilter.name,
                type: theFilter.type,
              }
            })
          }, 1)

          break

        case 'lithologies':
          // Need to fetch the definition in the event of filter passed via the uri
          axios.get(`${SETTINGS.apiDomain}/api/v2/defs/lithologies?lith_id=${theFilter.id}`, {
            responseType: 'json'
          })
          .then(json => {
            let f = json.data.success.data[0]

            axios.get(`${SETTINGS.apiDomain}/api/v2/mobile/map_filter?lith_id=${theFilter.id}`, {
              responseType: 'json'
            })
            .then(json => {
              dispatch({
                type: ADD_FILTER,
                filter: {
                  category: 'lithology',
                  id: theFilter.id,
                  type: 'lithologies',
                  name: f.name,
                  legend_ids: json.data
                }
              })
            })
          })
          .catch(error => {
            // don't care 💁
          })

          break

        case 'environments':
        case 'environment_types':
        case 'environment_classes':
          dispatch({
            type: ADD_FILTER,
            filter: theFilter
          })
          break

        default:
          console.log('i do not support that filter type', theFilter.type)
      }

    if (mapHasColumns) {
      dispatch(getFilteredColumns(filters.concat([theFilter])))
    }
  }
}

export function getFilteredColumns(providedFilters) {
  return (dispatch, getState) => {
    let { mapHasColumns, filters } = getState().update

    if (!providedFilters) {
      providedFilters = filters
    }

    let query = {}
    providedFilters.forEach(f => {
      if (f.type === 'intervals') {
        if (query['int_id']) {
          query['int_id'].push(f.id)
        } else {
          query['int_id'] = [f.id]
        }
      } else if (f.type === 'strat_name_concepts') {
        if (query['strat_name_concept_id']) {
          query['strat_name_concept_id'].push(f.id)
        } else {
          query['strat_name_concept_id'] = [f.id]
        }
      } else if (f.type === 'strat_name_orphans') {
        if (query['strat_name_id']) {
          query['strat_name_id'].push(f.id)
        } else {
          query['strat_name_id'] = [f.id]
        }
      } else if (f.type === 'lithology_classes') {
        if (query['lith_class']) {
          query['lith_class'].push(f.name)
        } else {
          query['lith_class'] = [f.name]
        }
      } else if (f.type === 'lithology_types') {
        if (query['lith_type']) {
          query['lith_type'].push(f.name)
        } else {
          query['lith_type'] = [f.name]
        }
      } else if (f.type === 'lithologies') {
        if (query['lith_id']) {
          query['lith_id'].push(f.id)
        } else {
          query['lith_id'] = [f.id]
        }
      } else if (f.type === 'environment') {
        if (query['environ_id']) {
          query['environ_id'].push(f.id)
        } else {
          query['environ_id'] = [ f.id ]
        }
      } else if (f.type === 'environment_types') {
        if (query['environ_type']) {
          query['environ_type'].push(f.name)
        } else {
          query['environ_type'] = [ f.name ]
        }
      } else if (f.type === 'environment_classes') {
        if (query['environ_class']) {
          query['environ_class'].push(f.name)
        } else {
          query['environ_class'] = [ f.name ]
        }
      }
    })

    let queryString = Object.keys(query).map(k => {
      return `${k}=${query[k].join(',')}`
    }).join('&')

    axios.get(`${SETTINGS.apiDomain}/api/v2/columns?format=geojson_bare&${queryString}`, {
      responseType: 'json'
    })
    .then(json => {

      dispatch({
        type: UPDATE_COLUMN_FILTERS,
        columns: json.data
      })
    })
  }
}

export function removeFilter(theFilter) {
  return {
    type: REMOVE_FILTER,
    filter: theFilter
  }
}


export function startColumnQuery(cancelToken) {
  return {
    type: START_COLUMN_QUERY,
    cancelToken: cancelToken
  }
}

export const getColumn = () => {
  return (dispatch, getState) => {
    let { infoMarkerLng, infoMarkerLat } = getState().update

    let CancelToken = axios.CancelToken
    let source = CancelToken.source()

    dispatch(startColumnQuery(source))

    return axios.get(`${SETTINGS.apiDomain}/api/v2/units?response=long&lng=${infoMarkerLng}&lat=${infoMarkerLat}`, {
      cancelToken: source.token,
      responseType: 'json'
    })
      .then(json => dispatch(receivedColumnQuery(json.data.success.data)))
      .catch(error => {
        // don't care 💁
      })
  }
}

export function receivedColumnQuery(data) {
  return {
    type: RECEIVED_COLUMN_QUERY,
    data: data
  }
}


export function startGddQuery(cancelToken) {
  return {
    type: START_GDD_QUERY,
    cancelToken: cancelToken
  }
}
export const getGdd = () => {
  return (dispatch, getState) => {
    let { mapInfo } = getState().update
    // Cancel if there is nothing to search for
    if (!mapInfo || !mapInfo.mapData.length || Object.keys(mapInfo.mapData[0].macrostrat).length === 0) {
      return dispatch(receivedGddQuery([]))
    }
    let stratNames = mapInfo.mapData[0].macrostrat.strat_names.map(d => { return d.rank_name }).join(',')

    let CancelToken = axios.CancelToken
    let source = CancelToken.source()

    dispatch(startGddQuery(source))

    return axios.get(`${SETTINGS.gddDomain}/api/v1/excerpts?term=${stratNames}`, {
      cancelToken: source.token,
      responseType: 'json'
    })
      .then(json => dispatch(receivedGddQuery(json.data.success.data)))
      .catch(error => {
        // don't care 💁
        dispatch(receivedGddQuery([]))
      })
  }
}

export function receivedGddQuery(data) {
  return {
    type: RECEIVED_GDD_QUERY,
    data: data
  }
}


export function startElevationQuery(cancelToken) {
  return {
    type: START_ELEVATION_QUERY,
    cancelToken: cancelToken
  }
}
export const getElevation = (line) => {
  return (dispatch) => {
    let CancelToken = axios.CancelToken
    let source = CancelToken.source()

    dispatch(startElevationQuery(source))

    return axios.get(`${SETTINGS.apiDomain}/api/v2/elevation?start_lng=${line[0][0]}&start_lat=${line[0][1]}&end_lng=${line[1][0]}&end_lat=${line[1][1]}`, {
      cancelToken: source.token,
      responseType: 'json'
    })
      .then(json => dispatch(receivedElevationQuery(json.data.success.data)))
      .catch(error => {
        // don't care 💁
        dispatch(receivedElevationQuery([]))
      })
  }
}

export function receivedElevationQuery(data) {
  return {
    type: RECEIVED_ELEVATION_QUERY,
    data: data
  }
}



export function startPbdbQuery(cancelToken) {
  return {
    type: START_PBDB_QUERY,
    cancelToken: cancelToken
  }
}

export function updatePbdbQuery(cancelToken) {
  return {
    type: UPDATE_PBDB_QUERY,
    cancelToken: cancelToken
  }
}

export const getPBDB = (collection_nos) => {
  return (dispatch) => {
    let CancelToken = axios.CancelToken
    let source = CancelToken.source()

    dispatch(startPbdbQuery(source))

    return axios.get(`${SETTINGS.pbdbDomain}/data1.2/colls/list.json?id=${collection_nos.join(',')}&show=ref,time,strat,geo,lith,entname,prot&markrefs`, {
      cancelToken: source.token,
      responseType: 'json'
    })
      .then(collectionResponse => {
        let CancelToken2 = axios.CancelToken
        let source2 = CancelToken.source()

        dispatch(updatePbdbQuery(source2))

        axios.get(`${SETTINGS.pbdbDomain}/data1.2/occs/list.json?coll_id=${collection_nos.join(',')}&show=phylo,ident`)
          .then(occurrenceResponse => {
            let occurrences = occurrenceResponse.data.records

            let collections = collectionResponse.data.records.map(col => {
              col.occurrences = []

              occurrences.forEach(occ => {
                if (occ.cid === col.oid) {
                  col.occurrences.push(occ)
                }
              })
              return col
            })

            dispatch(receivedPbdbQuery(collections))

          })
      })
      .catch(error => {
        // don't care 💁
        dispatch(receivedPbdbQuery([]))
      })
  }
}

export function receivedPbdbQuery(data) {
  return {
    type: RECEIVED_PBDB_QUERY,
    data: data
  }
}


export function mapMoved(data) {
  return {
    type: MAP_MOVED,
    data: data
  }
}

export function gotInitialMapState(mapState) {
  return {
    type: GOT_INITIAL_MAP_STATE,
    data: mapState
  }
}

export function getInitialMapState() {
  return (dispatch, getState) => {
    // Get the default map state
    let { mapXYZ, mapHasBedrock, mapHasLines, mapHasSatellite, mapHasColumns, mapHasFossils } = getState().update
    let defaultState = {
      z: mapXYZ.z,
      x: mapXYZ.x,
      y: mapXYZ.y,
      satellite: mapHasSatellite,
      bedrock: mapHasBedrock,
      lines: mapHasLines,
      columns: mapHasColumns,
      fossils: mapHasFossils
    }
    let filterTypes = ['strat_name_concepts','strat_name_orphans','intervals','lithology_classes','lithology_types','lithologies','environments','environment_types','environment_classes',]
    let hash = window.location.hash
    let mapState = {
      incomingFilters: []
    }
    try {
      hash = hash.split('/').forEach(d => {
        let parts = d.split('=')

        if (filterTypes.indexOf(parts[0]) > -1) {
          mapState.incomingFilters.push({ type: parts[0], id: parts[1] })
        } else {
          mapState[parts[0]] = parts[1] || true
        }

      })

      if (
        mapState.x &&
        mapState.y &&
        mapState.z &&
        (mapState.x >= -180 && mapState.x <= 180) &&
        (mapState.y >= -85 && mapState.y <= 85) &&
        (mapState.z >= 0 && mapState.z <= 16)
      ) {
        // Sweet, it is legit
        mapState = mapState
      } else {
        // Someone was naughty
        mapState = defaultState
      }
    } catch(e) {
      // Who knows. Doesn't matter. Nothing does.
      mapState = defaultState
    }

    dispatch(gotInitialMapState(mapState))

    if (mapState.incomingFilters && mapState.incomingFilters.length) {
      mapState.incomingFilters.forEach(f => {
        // lith classes and types don't have unique IDs in macrostrat so we use the string
        if (f.type === 'lithology_classes' || f.type === 'lithology_types') {
          dispatch(addFilter({
            type: f.type,
            name: f.id
          }))
        } else {
          dispatch(addFilter(f))
        }
      })
    }
  }

}


export function startGeolocation() {

}

export function askForGeolocationPermissions() {

}

export function receivedGeolocationPermissions() {

}

export function goToUserLocation() {

}

export function wentToUserLocation() {

}
