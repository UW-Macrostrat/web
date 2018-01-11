import fetch from 'isomorphic-fetch'
import { addCommas } from '../utils'

// Define constants to be passed with actions
export const PAGE_CLICK = 'PAGE_CLICK'
export const RECIEVE_DATA = 'RECIEVE_DATA'
export const REQUEST_DATA = 'REQUEST_DATA'

// Define action functions
export const pageClick = () => {
  return {
    type: PAGE_CLICK,
    msg: 'You clicked on the page',
    clicks: 0
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

export const fetchData = () => {
  return function (dispatch) {

    // Update state to know what is being fetched
    dispatch(requestData())

    return fetch('')
      .then(response => response.json())
      .then(formatted => formatResponse(formatted.success.data))
      .then(json => dispatch(recieveDictionaries(json)))
  }
}
