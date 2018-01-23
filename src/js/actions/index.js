import fetch from 'isomorphic-fetch'
import { addCommas } from '../utils'

// Define constants to be passed with actions
export const PAGE_CLICK = 'PAGE_CLICK'
export const RECIEVE_DATA = 'RECIEVE_DATA'
export const REQUEST_DATA = 'REQUEST_DATA'

export const TOGGLE_MENU = 'TOGGLE_MENU'
export const TOGGLE_INFODRAWER = 'TOGGLE_INFODRAWER'
export const EXPAND_INFODRAWER = 'EXPAND_INFODRAWER'
export const TOGGLE_FILTERS = 'TOGGLE_FILTERS'

export const START_MAP_QUERY = 'START_MAP_QUERY'
export const RECEIVED_MAP_QUERY = 'RECEIVED_MAP_QUERY'

export const TOGGLE_BEDROCK = 'TOGGLE_BEDROCK'

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
export const toggleInfoDrawer = () => {
  return {
    type: TOGGLE_INFODRAWER
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

export function startMapQuery(data) {
  return {
    type: START_MAP_QUERY,
    lng: data.lng,
    lat: data.lat
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
    dispatch(startMapQuery({lng: lng, lat: lat}))

    return fetch(`https://dev.macrostrat.org/api/v2/mobile/map_query_v2?lng=${lng.toFixed(5)}&lat=${lat.toFixed(5)}&z=${z.toFixed(0)}`)
      .then(response => response.json())
      .then(json => addMapIdToRef(json))
      .then(json => dispatch(receivedMapQuery(json.success.data)))
  }
}

// export const fetchData = () => {
//   return function (dispatch) {
//
//     // Update state to know what is being fetched
//     dispatch(requestData())
//
//     return fetch('')
//       .then(response => response.json())
//       .then(data => function(data) {
//         data.success.data.mapData = data.success.data.mapData.map(source => {
//           source.ref.map_id = source.map_id
//           return source
//         })
//         return data
//       })
//       .then(json => dispatch(recieveDictionaries(json)))
//   }
// }
