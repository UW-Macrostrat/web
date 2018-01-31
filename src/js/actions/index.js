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

export const TOGGLE_FILTERS = 'TOGGLE_FILTERS'
export const ADD_FILTER = 'ADD_FILTER'
export const REMOVE_FILTER = 'REMOVE_FILTER'
export const UPDATE_COLUMN_FILTERS = 'UPDATE_COLUMN_FILTERS'

export const START_MAP_QUERY = 'START_MAP_QUERY'
export const RECEIVED_MAP_QUERY = 'RECEIVED_MAP_QUERY'

export const TOGGLE_BEDROCK = 'TOGGLE_BEDROCK'
export const TOGGLE_SATELLITE = 'TOGGLE_SATELLITE'
export const TOGGLE_COLUMNS = 'TOGGLE_COLUMNS'
export const TOGGLE_INDEXMAP = 'TOGGLE_INDEXMAP'

export const START_SEARCH_QUERY = 'START_SEARCH_QUERY'
export const RECEIVED_SEARCH_QUERY = 'RECEIVED_SEARCH_QUERY'
export const GO_TO_PLACE = 'GO_TO_PLACE'

// Define action functions
export const pageClick = () => {
  return {
    type: PAGE_CLICK,
    msg: 'You clicked on the page',
    clicks: 0
  }
}

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
export const toggleIndexMap = () => {
  return {
    type: TOGGLE_INDEXMAP
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

export const queryMap = (lng, lat, z) => {
  return (dispatch) => {
    let CancelToken = axios.CancelToken
    let source = CancelToken.source()

    dispatch(startMapQuery({lng: lng, lat: lat}, source))

    return axios.get(`${SETTINGS.apiDomain}/api/v2/mobile/map_query_v2?lng=${lng.toFixed(5)}&lat=${lat.toFixed(5)}&z=${parseInt(z)}`, {
      cancelToken: source.token,
      responseType: 'json'
    })
    .then(json => addMapIdToRef(json.data))
    .then(json => dispatch(receivedMapQuery(json.success.data)))
    .catch(error => {
      // don't care 💁
    })
  }
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

    return axios.get(`${SETTINGS.apiDomain}/api/v2/mobile/autocomplete?include=interval,lithology,strat_name&query=${term}`, {
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
            axios.get(`${SETTINGS.apiDomain}/api/v2/mobile/map_filter?concept_id=${theFilter.id}`, {
              responseType: 'json'
            })
            .then(json => {
              theFilter.legend_ids = json.data
              dispatch({
                type: ADD_FILTER,
                filter: theFilter
              })
            })
          break

        case 'strat_name_orphans':
            axios.get(`${SETTINGS.apiDomain}/api/v2/mobile/map_filter?strat_name_id=${theFilter.id}`, {
              responseType: 'json'
            })
            .then(json => {
              theFilter.legend_id = json.data
              dispatch({
                type: ADD_FILTER,
                filter: theFilter
              })
            })
          break

        case 'intervals':
            axios.get(`${SETTINGS.apiDomain}/api/v2/defs/intervals?int_id=${theFilter.id}`, {
              responseType: 'json'
            })
            .then(json => {
              let f = json.data.success.data[0]
              f.name = theFilter.name
              f.type = theFilter.type
              f.category = theFilter.category
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
          dispatch({
            type: ADD_FILTER,
            filter: theFilter
          })
          break

        case 'lithologies':
          axios.get(`${SETTINGS.apiDomain}/api/v2/mobile/map_filter?lith_id=${theFilter.id}`, {
            responseType: 'json'
          })
          .then(json => {
            theFilter.legend_ids = json.data
            dispatch({
              type: ADD_FILTER,
              filter: theFilter
            })
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
