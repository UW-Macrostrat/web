import { updateURI } from "./helpers";
import { sum, timescale } from "../utils";
import { MapBackend } from "../map-page";
import { Action, MapState } from "./actions";

const classColors = {
  sedimentary: "#FF8C00",
  metamorphic: "#8B4513",
  igneous: "#9F1D0F",
  marine: "#047BFF",
  "non-marine": "#A67A45",
  "precious commodity": "#FDFDFC",
  material: "#777777",
  water: "#00CCFF",
  energy: "#333333",
};

interface AppState extends MapState {
  initialLoadComplete: boolean;
  menuOpen: boolean;
  aboutOpen: boolean;
  infoDrawerOpen: boolean;
  infoDrawerExpanded: boolean;
  isFetching: boolean;
}

const preloadedState: AppState = {
  initialLoadComplete: false,
  menuOpen: false,
  aboutOpen: false,
  infoDrawerOpen: false,
  infoDrawerExpanded: false,
  elevationChartOpen: false,
  mapBackend: {
    current: MapBackend.MAPBOX3,
    previous: null,
  },
  // Events and tokens for xhr
  isFetching: false,
  fetchingMapInfo: false,
  mapInfoCancelToken: null,
  fetchingColumnInfo: false,
  columnInfoCancelToken: null,
  fetchingGdd: false,
  gddCancelToken: null,
  isSearching: false,
  term: "",
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
  searchResults: null,
  elevationData: [],
  elevationMarkerLocation: [],
  pbdbData: [],

  mapIsLoading: false,
  mapHasBedrock: true,
  mapHasLines: true,
  mapHasSatellite: false,
  mapHasColumns: false,
  mapHasFossils: false,
  mapCenter: {
    type: null,
  },

  filtersOpen: false,
  filters: [],
  filteredColumns: {},

  data: [],
  mapPosition: {
    camera: {
      lng: 23,
      lat: 16,
      altitude: 300000,
    },
  },
};

const update = (state = preloadedState, action: Action) => {
  switch (action.type) {
    case "set-map-backend": {
      const newState = Object.assign({}, state, {
        mapBackend: {
          current: action.backend,
          prevous: state.mapBackend.current,
        },
      });
      updateURI(newState);
      return newState;
    }
    case "map-loading":
      return {
        ...state,
        mapIsLoading: true,
        mapBackend: { ...state.mapBackend }, //, previous: null },
      };
    case "map-idle":
      return { ...state, mapIsLoading: false };
    case "toggle-menu":
      return Object.assign({}, state, {
        menuOpen: !state.menuOpen,
      });
    case "toggle-about":
      return Object.assign({}, state, {
        aboutOpen: !state.aboutOpen,
      });
    case "close-infodrawer":
      return Object.assign({}, state, {
        infoDrawerOpen: false,
        columnInfo: {},
        mapInfo: [],
        pbdbData: [],
      });
    case "toggle-infodrawer":
      return Object.assign({}, state, {
        infoDrawerOpen: !state.infoDrawerOpen,
        infoDrawerExpanded: false,
        columnInfo: {},
        gddInfo: [],
      });

    case "expand-infodrawer":
      return Object.assign({}, state, {
        infoDrawerExpanded: !state.infoDrawerExpanded,
      });

    case "toggle-filters":
      // rework this to open menu panel
      return Object.assign({}, state, {
        filtersOpen: !state.filtersOpen,
      });
    case "add-filter":
      let alreadyHasFiter = false;
      state.filters.forEach((filter) => {
        if (
          filter.name === action.filter.name &&
          filter.type === action.filter.type
        ) {
          alreadyHasFiter = true;
        }
      });
      let fs = state.filters;
      // if incoming is 'all', remove non-'all' version
      if (action.filter.type.substr(0, 4) === "all_") {
        fs = fs.filter((f) => {
          if (
            f.type === action.filter.type.replace("all_", "") &&
            f.id === action.filter.id &&
            f.name === action.filter.name
          ) {
            // do nothing
          } else {
            return f;
          }
        });
      }
      // if incoming is NOT 'all', remove the 'all' version
      else {
        fs = fs.filter((f) => {
          if (
            f.type === `all_${action.filter.type}` &&
            f.id === action.filter.id &&
            f.name === action.filter.name
          ) {
            // do nothing
          } else {
            return f;
          }
        });
      }
      if (!alreadyHasFiter) {
        fs = fs.concat([action.filter]);
      }
      // action.filter.type and action.filter.id go to the URI
      updateURI(
        Object.assign({}, state, {
          filters: fs,
        })
      );
      return Object.assign({}, state, {
        filters: fs,
      });
    case "remove-filter":
      updateURI(
        Object.assign({}, state, {
          filters: state.filters.filter((d) => {
            if (d.name != action.filter.name) return d;
          }),
        })
      );
      return Object.assign({}, state, {
        filters: state.filters.filter((d) => {
          if (d.name != action.filter.name) return d;
        }),
      });
    case "clear-filters":
      updateURI(
        Object.assign({}, state, {
          filters: [],
        })
      );
      return Object.assign({}, state, {
        filters: [],
      });
    case "start-map-query":
      if (state.mapInfoCancelToken) {
        state.mapInfoCancelToken.cancel();
      }
      console.log("MAP BEING QUERIED", action);
      return Object.assign({}, state, {
        infoMarkerLng: action.lng.toFixed(4),
        infoMarkerLat: action.lat.toFixed(4),
        fetchingMapInfo: true,
        infoDrawerOpen: true,
        mapInfoCancelToken: action.cancelToken,
      });
    case "received-map-query":
      if (action.data && action.data.mapData) {
        action.data.mapData = action.data.mapData.map((source) => {
          if (source.macrostrat) {
            if (source.macrostrat.liths) {
              let types = {};

              source.macrostrat.liths.forEach((lith) => {
                if (!types[lith.lith_type]) {
                  types[lith.lith_type] = {
                    name: lith.lith_type,
                    color: classColors[lith.lith_class],
                  };
                }
              });
              source.macrostrat.lith_types = Object.keys(types).map(
                (l) => types[l]
              );
            }
            if (source.macrostrat.environs) {
              let types = {};

              source.macrostrat.environs.forEach((environ) => {
                if (!types[environ.environ_type]) {
                  types[environ.environ_type] = {
                    name: environ.environ_type,
                    color: classColors[environ.environ_class],
                  };
                }
              });
              source.macrostrat.environ_types = Object.keys(types).map(
                (l) => types[l]
              );
            }
            if (source.macrostrat.econs) {
              let types = {};

              source.macrostrat.econs.forEach((econ) => {
                if (!types[econ.econ_type]) {
                  types[econ.econ_type] = {
                    name: econ.econ_type,
                    color: classColors[econ.econ_class],
                  };
                }
              });
              source.macrostrat.econ_types = Object.keys(types).map(
                (l) => types[l]
              );
            }
          }

          return source;
        });
      }

      return Object.assign({}, state, {
        fetchingMapInfo: false,
        mapInfo: action.data,
        infoDrawerOpen: true,
      });

    case "start-column-query":
      if (state.columnInfoCancelToken) {
        state.columnInfoCancelToken.cancel();
      }
      return Object.assign({}, state, {
        fetchingColumnInfo: true,
        columnInfoCancelToken: action.cancelToken,
      });

    case "received-column-query":
      // summarize units
      let columnTimescale = timescale.slice().map((d) => {
        d.intersectingUnits = 0;
        d.intersectingUnitIds = [];
        return d;
      });

      let columnSummary = {
        ...action.column,
        max_thick: sum(action.data, "max_thick"),
        min_thick: sum(action.data, "min_thick"),
        pbdb_collections: sum(action.data, "pbdb_collections"),
        pbdb_occs: sum(action.data, "pbdb_occurrences"),
        b_age: Math.max(
          ...action.data.map((d) => {
            return d.b_age;
          })
        ),
        t_age: Math.min(
          ...action.data.map((d) => {
            return d.t_age;
          })
        ),
        area: action.data.length ? parseInt(action.data[0].col_area) : 0,
      };

      for (let i = 0; i < action.data.length; i++) {
        action.data[i].intersectingUnits = 0;
        action.data[i].intersectingUnitIds = [];
        for (let j = 0; j < action.data.length; j++) {
          if (
            // unit *contains* unit
            ((action.data[i].t_age < action.data[j].b_age &&
              action.data[j].t_age < action.data[i].b_age) ||
              // units share t and b age
              (action.data[i].t_age === action.data[j].t_age &&
                action.data[i].b_age === action.data[j].b_age) ||
              // units share t_age, but not b_age
              (action.data[i].t_age === action.data[j].t_age &&
                action.data[i].b_age <= action.data[j].b_age) ||
              // units share b_age, but not t_age
              (action.data[i].b_age === action.data[j].b_age &&
                action.data[i].t_age >= action.data[j].t_age)) &&
            action.data[i].unit_id != action.data[j].unit_id
          ) {
            action.data[i].intersectingUnits += 1;
            action.data[i].intersectingUnitIds.push(action.data[j].unit_id);
          }
        }

        for (let j = 0; j < columnTimescale.length; j++) {
          // Need to explicitly overlap, not
          if (
            // interval *contains* unit
            (action.data[i].t_age < columnTimescale[j].b_age &&
              columnTimescale[j].t_age < action.data[i].b_age) ||
            // interval and unit share t and b age
            (action.data[i].t_age === columnTimescale[j].t_age &&
              action.data[i].b_age === columnTimescale[j].b_age) ||
            // interval and unit share t_age, but not b_age
            (action.data[i].t_age === columnTimescale[j].t_age &&
              action.data[i].b_age <= columnTimescale[j].b_age) ||
            // interval and unit share b_age, but not t_age
            (action.data[i].b_age === columnTimescale[j].b_age &&
              action.data[i].t_age >= columnTimescale[j].t_age)
          ) {
            columnTimescale[j].intersectingUnitIds.push(action.data[i].unit_id);
          }
        }
      }

      let unitIdx = {};
      action.data.forEach((unit) => {
        unitIdx[unit["unit_id"]] = unit;
        unitIdx[unit["unit_id"]]["drawn"] = false;
      });

      columnTimescale = columnTimescale.filter((d) => {
        if (d.intersectingUnits.length > 0) {
          return d;
        }
      });
      columnSummary["timescale"] = columnTimescale;
      columnSummary["units"] = action.data;
      columnSummary["unitIdx"] = unitIdx;

      return Object.assign({}, state, {
        fetchingColumnInfo: false,
        columnInfo: columnSummary,
      });

    case "toggle-bedrock":
      updateURI(
        Object.assign({}, state, {
          mapHasBedrock: !state.mapHasBedrock,
        })
      );
      return Object.assign({}, state, {
        mapHasBedrock: !state.mapHasBedrock,
      });

    case "toggle-lines":
      updateURI(
        Object.assign({}, state, {
          mapHasLines: !state.mapHasLines,
        })
      );
      return Object.assign({}, state, {
        mapHasLines: !state.mapHasLines,
      });

    case "toggle-satellite":
      updateURI(
        Object.assign({}, state, {
          mapHasSatellite: !state.mapHasSatellite,
        })
      );
      return Object.assign({}, state, {
        mapHasSatellite: !state.mapHasSatellite,
      });
    case "toggle-columns":
      updateURI(
        Object.assign({}, state, {
          mapHasColumns: !state.mapHasColumns,
        })
      );
      return Object.assign({}, state, {
        mapHasColumns: !state.mapHasColumns,
      });
    case "toggle-fossils":
      updateURI(
        Object.assign({}, state, {
          mapHasFossils: !state.mapHasFossils,
        })
      );
      return Object.assign({}, state, {
        mapHasFossils: !state.mapHasFossils,
      });
    case "toggle-elevation-chart":
      return Object.assign({}, state, {
        elevationChartOpen: !state.elevationChartOpen,
        elevationData: [],
        elevationMarkerLocation: [],
      });
    case "set-input-focus":
      return Object.assign({}, state, { inputFocus: action.inputFocus });
    case "set-search-term":
      return Object.assign({}, state, { term: action.term });
    // Handle searching
    case "start-search-query":
      // When a search is requested, cancel any pending requests first
      if (state.searchCancelToken) {
        state.searchCancelToken.cancel();
      }
      return Object.assign({}, state, {
        isSearching: true,
        searchCancelToken: action.cancelToken,
      });
    case "received-search-query":
      return Object.assign({}, state, {
        isSearching: false,
        searchResults: action.data,
        searchCancelToken: null,
      });

    case "start-gdd-query":
      // When a search is requested, cancel any pending requests first
      if (state.gddCancelToken) {
        state.gddCancelToken.cancel();
      }
      return Object.assign({}, state, {
        fetchingGdd: true,
        gddCancelToken: action.cancelToken,
      });
    case "received-gdd-query":
      let parsed = {
        journals: [],
      };
      let articles = {};

      for (let i = 0; i < action.data.length; i++) {
        let found = false;
        if (articles[action.data[i].docid]) {
          continue;
        } else {
          articles[action.data[i].docid] = true;
        }
        for (let j = 0; j < parsed.journals.length; j++) {
          if (parsed.journals[j].name === action.data[i].journal) {
            parsed.journals[j].articles.push(action.data[i]);
            found = true;
          }
        }

        if (!found) {
          parsed.journals.push({
            name: action.data[i].journal,
            source: action.data[i].publisher,
            articles: [action.data[i]],
          });
        }
      }

      return Object.assign({}, state, {
        fetchingGdd: false,
        gddInfo: parsed.journals,
        gddCancelToken: null,
      });

    // Handle elevation
    case "start-elevation-query":
      // When a search is requested, cancel any pending requests first
      if (state.elevationCancelToken) {
        state.elevationCancelToken.cancel();
      }
      return Object.assign({}, state, {
        fetchingElevation: true,
        elevationCancelToken: action.cancelToken,
      });
    case "received-elevation-query":
      return Object.assign({}, state, {
        fetchingElevation: false,
        elevationData: action.data,
        elevationCancelToken: null,
      });
    case "update-elevation-marker":
      return Object.assign({}, state, {
        elevationMarkerLocation: [action.lng, action.lat],
      });

    // Handle PBDB
    case "start-pbdb-query":
      if (state.pbdbCancelToken) {
        state.pbdbCancelToken.cancel();
      }
      return Object.assign({}, state, {
        fetchingPbdb: true,
        pbdbCancelToken: action.cancelToken,
      });

    case "update-pbdb-query":
      if (state.pbdbCancelToken) {
        state.pbdbCancelToken.cancel();
      }
      return Object.assign({}, state, {
        pbdbCancelToken: action.cancelToken,
      });

    case "received-pbdb-query":
      return Object.assign({}, state, {
        fetchingPbdb: false,
        pbdbData: action.data,
        pbdbCancelToken: null,
        infoDrawerOpen: true,
      });

    case "reset-pbdb":
      return Object.assign({}, state, {
        pbdbData: [],
      });

    case "go-to-place":
      return Object.assign({}, state, {
        mapCenter: {
          type: "place",
          place: action.place,
        },
      });

    case "update-column-filters":
      console.log("Filtered Columns", action.columns);
      return Object.assign({}, state, {
        filteredColumns: action.columns,
      });
    case "request-data":
      return Object.assign({}, state, {
        isFetching: true,
      });
    case "recieve-data":
      return Object.assign({}, state, {
        isFetching: false,
        data: action.data,
      });
    case "map-moved":
      return updateURI({ ...state, mapPosition: action.data });
    case "update-state":
      return action.state;

    case "got-initial-map-state":
      const { layers = [], position, backend } = action.data;
      const mapHasSatellite = layers.includes("satellite");
      const mapHasLines = layers.includes("lines");
      const mapHasColumns = layers.includes("columns");
      const mapHasFossils = layers.includes("fossils");
      const mapHasBedrock = layers.includes("bedrock");

      const newState = Object.assign({}, state, {
        initialLoadComplete: true,
        mapBackend: backend ?? MapBackend.MAPBOX,
        mapHasSatellite,
        mapHasBedrock,
        mapHasLines,
        mapHasColumns,
        mapHasFossils,
        mapPosition: position,
      });
      // This causes some hilarious problems...
      updateURI(newState);
      return newState;

    default:
      return state;
  }
};

export default update;
export { preloadedState };
