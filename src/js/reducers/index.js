import { combineReducers } from 'redux'
import { PAGE_CLICK, REQUEST_DATA, RECIEVE_DATA, TOGGLE_MENU, TOGGLE_INFODRAWER, EXPAND_INFODRAWER, TOGGLE_FILTERS, START_MAP_QUERY, RECEIVED_MAP_QUERY, TOGGLE_BEDROCK } from '../actions'

const classColors = {
  'sedimentary': '#FF8C00',
  'metamorphic': '#8B4513',
  'igneous': '#9F1D0F',

  'marine': '#047BFF',
  'non-marine': '#A67A45',

  'precious commodity': '#FDFDFC',
  'material': '#777777',
  'water': '#00CCFF',
  'energy': '#333333'
}


const update = (state = {
  menuOpen: false,
  infoDrawerOpen: false,
  infoDrawerExpanded: false,
  isFetching: false,
  filtersOpen: false,
  infoMarkerLng: -999,
  infoMarkerLat: -999,
  mapInfo: [],
  fetchingMapInfo: false,
  mapHasBedrock: true,

  data: [],
  filters: [],
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
        infoDrawerOpen: !state.infoDrawerOpen,
        infoDrawerExpanded: false
      })
    case EXPAND_INFODRAWER:
      return Object.assign({}, state, {
        infoDrawerExpanded: !state.infoDrawerExpanded
      })
    case TOGGLE_FILTERS:
      return Object.assign({}, state, {
        filtersOpen: !state.filtersOpen
      })
    case START_MAP_QUERY:
      return Object.assign({}, state, {
        infoMarkerLng: action.lng.toFixed(4),
        infoMarkerLat: action.lat.toFixed(4),
        fetchingMapInfo: true
      })
    case RECEIVED_MAP_QUERY:
      if (action.data && action.data.mapData) {
        action.data.mapData = action.data.mapData.map(source => {
          if (source.macrostrat) {
            if (source.macrostrat.liths) {
              source.macrostrat.lith_classes = [ ... new Set(source.macrostrat.liths.map(lith => {
                return lith.lith_class
              })) ]
                .map(lith_class => {
                  return {
                    name: lith_class,
                    color: classColors[lith_class]
                  }
                })
            }
            if (source.macrostrat.environs) {
              source.macrostrat.environ_classes = [ ... new Set(source.macrostrat.environs.map(environ => {
                return environ.environ_class
              })) ]
                .map(environ_class => {
                  return {
                    name: environ_class,
                    color: classColors[environ_class]
                  }
                })
            }
            if (source.macrostrat.econs) {
              source.macrostrat.econ_classes = [ ... new Set(source.macrostrat.econs.map(econ => {
                return econ.econ_class
              })) ]
                .map(econ_class => {
                  return {
                    name: econ_class,
                    color: classColors[econ_class]
                  }
                })
            }

          }

          return source
        })
      }

      return Object.assign({}, state, {
        fetchingMapInfo: false,
        mapInfo: action.data,
        infoDrawerOpen: true
      })
    case TOGGLE_BEDROCK:
      return Object.assign({}, state, {
        mapHasBedrock: !state.mapHasBedrock
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
