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

export const START_MAP_QUERY = 'START_MAP_QUERY'
export const RECEIVED_MAP_QUERY = 'RECEIVED_MAP_QUERY'

export const TOGGLE_BEDROCK = 'TOGGLE_BEDROCK'
export const TOGGLE_SATELLITE = 'TOGGLE_SATELLITE'

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
  switch(theFilter.type) {
    case 'place':
      return (dispatch) => {
        dispatch({
          type: GO_TO_PLACE,
          place: theFilter
        })
      }
      break

    case 'strat_name_concepts':
      return (dispatch) => {
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
      }
      break
    case 'strat_name_orphans':
      return (dispatch) => {
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
      }
      break

    case 'intervals':
      return (dispatch) => {
          axios.get(`${SETTINGS.apiDomain}/api/v2/defs/intervals?int_id=${theFilter.id}`, {
            responseType: 'json'
          })
          .then(json => {
            let f = json.data.success.data[0]
            f.name = theFilter.name
            f.type = theFilter.type
            f.category = theFilter.category
            dispatch({
              type: ADD_FILTER,
              filter: f
            })
          })
          .catch(error => {
            // don't care 💁
          })
      }
      break
    case 'lithology_classes':
    case 'lithology_types':
      return (dispatch) => {
        dispatch({
          type: ADD_FILTER,
          filter: theFilter
        })
      }
      break

    case 'lithologies':
      return (dispatch) => {
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
      }
      break

    default:
      console.log('i do not support that filter type', theFilter.type)
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
