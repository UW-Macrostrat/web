import { combineReducers } from 'redux'
import { PAGE_CLICK, REQUEST_DATA, RECIEVE_DATA, TOGGLE_MENU, TOGGLE_INFODRAWER, EXPAND_INFODRAWER } from '../actions'

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

const update = (state = {
  menuOpen: false,
  infoDrawerOpen: false,
  infoDrawerExpanded: false,
  isFetching: false,
  data: [],
  msg: '',
  clicks: 0
}, action) => {

  switch (action.type) {
    case TOGGLE_MENU:
      return Object.assign({}, state, {
        menuOpen: !state.menuOpen
      })
    case TOGGLE_INFODRAWER:
      return Object.assign({}, state, {
        infoDrawerOpen: !state.infoDrawerOpen
      })
    case EXPAND_INFODRAWER:
      console.log('expand')
      return Object.assign({}, state, {
        infoDrawerExpanded: !state.infoDrawerExpanded
      })
    case PAGE_CLICK:
      return Object.assign({}, state, {
        msg: action.msg,
        clicks: state.clicks + 1,
        infoDrawerOpen: !state.infoDrawerOpen
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
  update
})

export default reducers
