import { combineReducers } from 'redux'
import { PAGE_CLICK, REQUEST_DATA, RECIEVE_DATA } from '../actions'

// import all reducers here
// const stats = (state = [], action) => {
//   switch (action.type, state) {
//     case TOGGLE_DICTIONARY:
//       return Object.assign({}, state, {
//         showDetails: action.dict_id
//       })
//
//     default:
//       return state
//   }
// }
//

const handleInteraction = (state = {
  isFetching: false,
  data: [],
  msg: '',
  clicks: 0
}, action) => {

  switch (action.type) {
    case PAGE_CLICK:
      return Object.assign({}, state, {
        msg: action.msg,
        clicks: state.clicks + 1
      })
    case REQUEST_DATA:
      return Object.assign({}, state, {
        isFetching: true
      })
    case RECIEVE_DATA:
      return Object.assign({}, state, {
        isFetching: false,
        data: action.data
      })
    default:
      return state
  }
}



const reducers = combineReducers({
  // list reducers here
//  stats,
  handleInteraction
})

export default reducers
