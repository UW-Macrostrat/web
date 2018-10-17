import { combineReducers } from 'redux'
import { REQUEST_DATA, RECIEVE_DATA, TOGGLE_MENU, TOGGLE_INFODRAWER, EXPAND_INFODRAWER, TOGGLE_FILTERS, START_MAP_QUERY, RECEIVED_MAP_QUERY, TOGGLE_BEDROCK, TOGGLE_LINES, TOGGLE_SATELLITE, TOGGLE_COLUMNS, CLOSE_INFODRAWER, START_SEARCH_QUERY, RECEIVED_SEARCH_QUERY, ADD_FILTER, REMOVE_FILTER, GO_TO_PLACE, TOGGLE_ABOUT, TOGGLE_FOSSILS, UPDATE_COLUMN_FILTERS, START_COLUMN_QUERY, RECEIVED_COLUMN_QUERY, START_GDD_QUERY, RECEIVED_GDD_QUERY, SET_ACTIVE_INDEX_MAP, TOGGLE_ELEVATION_CHART, START_ELEVATION_QUERY, RECEIVED_ELEVATION_QUERY, START_PBDB_QUERY, UPDATE_PBDB_QUERY, RECEIVED_PBDB_QUERY, MAP_MOVED, GET_INITIAL_MAP_STATE, GOT_INITIAL_MAP_STATE } from '../actions'
import { sum, timescale } from '../utils'

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
  aboutOpen: false,
  infoDrawerOpen: false,
  infoDrawerExpanded: false,
  elevationChartOpen: false,


  // Events and tokens for xhr
  isFetching: false,
  fetchingMapInfo: false,
  mapInfoCancelToken: null,
  fetchingColumnInfo: false,
  columnInfoCancelToken: null,
  fetchingGdd: false,
  gddCancelToken: null,
  isSearching: false,
  searchCancelToken: null,
  fetchingElevation: false,
  elevationCancelToken: null,
  fetchingPbdb: false,
  pbdbCancelToken: null,

  infoMarkerLng: -999,
  infoMarkerLat: -999,
  mapInfo: [],
  columnInfo: {},
  gddInfo: [],
  searchResults: [],
  elevationData: [],
  pbdbInfo: [],

  mapHasBedrock: true,
  mapHasLines: true,
  mapHasSatellite: false,
  mapHasColumns: false,
  mapHasFossils: false,
  mapCenter: {
    type: null
  },

  filtersOpen: false,
  filters: [],
  filteredColumns: {},

  data: [],
  mapXYZ: {
    z: 1.5,
    x: 16,
    y: 23,
  }
}, action) => {
  switch (action.type) {
    case TOGGLE_MENU:
      return Object.assign({}, state, {
        menuOpen: !state.menuOpen
      })
    case TOGGLE_ABOUT:
      return Object.assign({}, state, {
        aboutOpen: !state.aboutOpen
      })
    case CLOSE_INFODRAWER:
      return Object.assign({}, state, {
        infoDrawerOpen: false,
        columnInfo: {},
        mapInfo: [],
        pbdbData: []
      })
    case TOGGLE_INFODRAWER:
      return Object.assign({}, state, {
        infoDrawerOpen: !state.infoDrawerOpen,
        infoDrawerExpanded: false,
        columnInfo: {}
      })

    case EXPAND_INFODRAWER:
      return Object.assign({}, state, {
        infoDrawerExpanded: !state.infoDrawerExpanded
      })

    case TOGGLE_FILTERS:
      return Object.assign({}, state, {
        filtersOpen: !state.filtersOpen
      })
    case ADD_FILTER:
      let alreadyHasFiter = false
      state.filters.forEach(filter => {
        if (filter.name === action.filter.name) {
          alreadyHasFiter = true
        }
      })
      let fs = state.filters
      if (!alreadyHasFiter) {
        fs = fs.concat([action.filter])
      }
      // action.filter.type and action.filter.id go to the URI
      updateURI(Object.assign({}, state, {
        filters: fs
      }))
      return Object.assign({}, state, {
        filters: fs
      })
    case REMOVE_FILTER:
      updateURI(Object.assign({}, state, {
        filters: state.filters.filter(d => {
          if (d.name != action.filter.name) return d
        })
      }))
      return Object.assign({}, state, {
        filters: state.filters.filter(d => {
          if (d.name != action.filter.name) return d
        })
      })

    case START_MAP_QUERY:
      if (state.mapInfoCancelToken) {
        state.mapInfoCancelToken.cancel()
      }
      return Object.assign({}, state, {
        infoMarkerLng: action.lng.toFixed(4),
        infoMarkerLat: action.lat.toFixed(4),
        fetchingMapInfo: true,
        infoDrawerOpen: true,
        mapInfoCancelToken: action.cancelToken
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

    case START_COLUMN_QUERY:
      if (state.columnInfoCancelToken) {
        state.columnInfoCancelToken.cancel()
      }
      return Object.assign({}, state, {
        fetchingColumnInfo: true,
        columnInfoCancelToken: action.cancelToken
      })

    case RECEIVED_COLUMN_QUERY:
      // summarize units
      let columnTimescale = timescale.slice().map(d => {
        d.intersectingUnits = 0
        d.intersectingUnitIds = []
        return d
      })

      let columnSummary = {
        max_thick: sum(action.data, 'max_thick'),
        min_thick: sum(action.data, 'min_thick'),
        pbdb_collections: sum(action.data, 'pbdb_collections'),
        pbdb_occs: sum(action.data, 'pbdb_occurrences'),
        b_age: Math.max(...action.data.map(d => { return d.b_age })),
        t_age: Math.min(...action.data.map(d => { return d.t_age })),
        area: (action.data.length) ? parseInt(action.data[0].col_area) : 0,
      }

      for (let i = 0; i < action.data.length; i++) {
        action.data[i].intersectingUnits = 0
        action.data[i].intersectingUnitIds = []
        for (let j = 0; j < action.data.length; j++) {
          if ((
            // unit *contains* unit
            (action.data[i].t_age < action.data[j].b_age && action.data[j].t_age < action.data[i].b_age) ||
            // units share t and b age
            (action.data[i].t_age === action.data[j].t_age && action.data[i].b_age === action.data[j].b_age) ||
            // units share t_age, but not b_age
            (action.data[i].t_age === action.data[j].t_age && action.data[i].b_age <= action.data[j].b_age) ||
            // units share b_age, but not t_age
            (action.data[i].b_age === action.data[j].b_age && action.data[i].t_age >= action.data[j].t_age)
          ) && action.data[i].unit_id != action.data[j].unit_id) {
            action.data[i].intersectingUnits += 1
            action.data[i].intersectingUnitIds.push(action.data[j].unit_id)
          }
        }

        for (let j = 0; j < columnTimescale.length; j++) {
          // Need to explicitly overlap, not
          if (
             // interval *contains* unit
             (action.data[i].t_age < columnTimescale[j].b_age && columnTimescale[j].t_age < action.data[i].b_age) ||
             // interval and unit share t and b age
             (action.data[i].t_age === columnTimescale[j].t_age && action.data[i].b_age === columnTimescale[j].b_age) ||
             // interval and unit share t_age, but not b_age
             (action.data[i].t_age === columnTimescale[j].t_age && action.data[i].b_age <= columnTimescale[j].b_age) ||
             // interval and unit share b_age, but not t_age
             (action.data[i].b_age === columnTimescale[j].b_age && action.data[i].t_age >= columnTimescale[j].t_age))
          {
            columnTimescale[j].intersectingUnitIds.push(action.data[i].unit_id)
          }
        }
      }


      let unitIdx = {}
      action.data.forEach( unit => {
        unitIdx[unit['unit_id']] = unit
        unitIdx[unit['unit_id']]['drawn'] = false
      })

      columnTimescale = columnTimescale.filter(d => {
        if (d.intersectingUnits.length > 0) {
          return d
        }
      })
      columnSummary['timescale'] = columnTimescale
      columnSummary['units'] = action.data
      columnSummary['unitIdx'] = unitIdx

      return Object.assign({}, state, {
        fetchingColumnInfo: false,
        columnInfo: columnSummary
      })

    case TOGGLE_BEDROCK:
      updateURI(Object.assign({}, state, {
        mapHasBedrock: !state.mapHasBedrock
      }))
      return Object.assign({}, state, {
        mapHasBedrock: !state.mapHasBedrock
      })

    case TOGGLE_LINES:
      updateURI(Object.assign({}, state, {
        mapHasLines: !state.mapHasLines
      }))
      return Object.assign({}, state, {
        mapHasLines: !state.mapHasLines
      })

    case TOGGLE_SATELLITE:
      updateURI(Object.assign({}, state, {
        mapHasSatellite: !state.mapHasSatellite
      }))
      return Object.assign({}, state, {
        mapHasSatellite: !state.mapHasSatellite
      })
    case TOGGLE_COLUMNS:
      updateURI(Object.assign({}, state, {
        mapHasColumns: !state.mapHasColumns
      }))
      return Object.assign({}, state, {
        mapHasColumns: !state.mapHasColumns
      })
    case TOGGLE_FOSSILS:
      updateURI(Object.assign({}, state, {
        mapHasFossils: !state.mapHasFossils
      }))
      return Object.assign({}, state, {
        mapHasFossils: !state.mapHasFossils
      })
    case TOGGLE_ELEVATION_CHART:
      return Object.assign({}, state, {
        elevationChartOpen: !state.elevationChartOpen,
        elevationData: []
      })

    // Handle searching
    case START_SEARCH_QUERY:
      // When a search is requested, cancel any pending requests first
      if (state.searchCancelToken) {
        state.searchCancelToken.cancel()
      }
      return Object.assign({}, state, {
        isSearching: true,
        searchCancelToken: action.cancelToken
      })
    case RECEIVED_SEARCH_QUERY:
      return Object.assign({}, state, {
        isSearching: false,
        searchResults: action.data,
        searchCancelToken: null
      })

    // Handle GDD
    case START_GDD_QUERY:
      // When a search is requested, cancel any pending requests first
      if (state.gddCancelToken) {
        state.gddCancelToken.cancel()
      }
      return Object.assign({}, state, {
        fetchingGdd: true,
        gddCancelToken: action.cancelToken
      })
    case RECEIVED_GDD_QUERY:
      // let parsed = {
      //   journals: []
      // }
      //
      // for (let i = 0; i < action.data.length; i++) {
      //   let found = false
      //   for (let j = 0; j < parsed.journals.length; j++) {
      //     if (parsed.journals[j].name === action.data[i].journal) {
      //       parsed.journals[j].articles.push(action.data[i])
      //       found = true
      //     }
      //   }
      //
      //   if (!found) {
      //     parsed.journals.push({
      //       name: action.data[i].journal,
      //       source: action.data[i].publisher,
      //       articles: [action.data[i]]
      //     })
      //   }
      // }
      return Object.assign({}, state, {
        fetchingGdd: false,
        gddInfo: action.data,
        gddCancelToken: null
      })

    // Handle elevation
    case START_ELEVATION_QUERY:
      // When a search is requested, cancel any pending requests first
      if (state.elevationCancelToken) {
        state.elevationCancelToken.cancel()
      }
      return Object.assign({}, state, {
        fetchingElevation: true,
        elevationCancelToken: action.cancelToken
      })
    case RECEIVED_ELEVATION_QUERY:
      return Object.assign({}, state, {
        fetchingElevation: false,
        elevationData: action.data,
        elevationCancelToken: null
      })

    // Handle PBDB
    case START_PBDB_QUERY:
      if (state.pbdbCancelToken) {
        state.pbdbCancelToken.cancel()
      }
      return Object.assign({}, state, {
        fetchingPbdb: true,
        pbdbCancelToken: action.cancelToken
      })

    case UPDATE_PBDB_QUERY:
      if (state.pbdbCancelToken) {
        state.pbdbCancelToken.cancel()
      }
      return Object.assign({}, state, {
        pbdbCancelToken: action.cancelToken
      })

    case RECEIVED_PBDB_QUERY:
      return Object.assign({}, state, {
        fetchingPbdb: false,
        pbdbData: action.data,
        pbdbCancelToken: null,
        infoDrawerOpen: true
      })

    case GO_TO_PLACE:
      return Object.assign({}, state, {
        mapCenter: {
          type: 'place',
          place: action.place
        }
      })

    case UPDATE_COLUMN_FILTERS:
      return Object.assign({}, state, {
        filteredColumns: action.columns
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

    case GET_INITIAL_MAP_STATE:
      return Object.assign({}, state, {
        mapXYZ: {
          z: action.data.z,
          x: action.data.x,
          y: action.data.y
        }
      })

    case MAP_MOVED:
      updateURI(Object.assign({}, state, {
        mapXYZ: {
          z: action.data.z,
          x: action.data.x,
          y: action.data.y
        }
      }))
      return Object.assign({}, state, {
        mapXYZ: {
          z: action.data.z,
          x: action.data.x,
          y: action.data.y
        }
      })

    case GOT_INITIAL_MAP_STATE:
      updateURI(Object.assign({}, state, {
        mapHasSatellite: action.data.satellite || false,
        mapHasBedrock: action.data.bedrock || false,
        mapHasLines: action.data.lines || false,
        mapHasColumns: action.data.columns || false,
        mapHasFossils: action.data.fossils || false,
        mapXYZ: {
          z: action.data.z,
          x: action.data.x,
          y: action.data.y
        },
      }))

      return Object.assign({}, state, {
        mapHasSatellite: action.data.satellite || false,
        mapHasBedrock: action.data.bedrock || false,
        mapHasLines: action.data.lines || false,
        mapHasColumns: action.data.columns || false,
        mapHasFossils: action.data.fossils || false,
        mapXYZ: {
          z: action.data.z,
          x: action.data.x,
          y: action.data.y
        },
      })

    default:
      return state
  }
}

function updateURI(state) {
  let layers = [
    {'layer': 'bedrock', 'haz': state.mapHasBedrock},
    {'layer': 'lines', 'haz': state.mapHasLines},
    {'layer': 'satellite', 'haz': state.mapHasSatellite},
    {'layer': 'fossils', 'haz': state.mapHasFossils},
    {'layer': 'columns', 'haz': state.mapHasColumns}]

  let layerString = layers.filter(l => { if (l.haz) return l }).map(l => { return l.layer }).join('/')
  let filtersString = state.filters.map(f => { return `${f.type}=${f.id || f.name}` }).join('/')

  // Update the hash in the URI
  window.history.replaceState(undefined, undefined, `#/z=${state.mapXYZ.z}/x=${state.mapXYZ.x}/y=${state.mapXYZ.y}/${layerString}/${filtersString}`)
}

const reducers = combineReducers({
  // list reducers here
//  stats,
  update
})

export default reducers
