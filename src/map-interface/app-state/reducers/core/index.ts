import { MapBackend, MapLayer, PositionFocusState } from "../map";
import { CoreState, CoreAction } from "./types";
import update, { Spec } from "immutability-helper";
import { FilterData } from "../../handlers/filters";
import { assembleColumnSummary } from "../../handlers/columns";
export * from "./types";

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

const defaultState: CoreState = {
  initialLoadComplete: false,
  contextPanelOpen: false,
  allColumns: null,
  allColumnsCancelToken: null,
  menuOpen: false,
  aboutOpen: false,
  infoDrawerOpen: false,
  infoDrawerExpanded: false,
  infoMarkerPosition: null,
  crossSectionLine: null,
  crossSectionCursorLocation: [],
  mapBackend: MapBackend.MAPBOX,
  mapLayers: new Set([MapLayer.BEDROCK, MapLayer.LINES, MapLayer.LABELS]),
  mapSettings: {
    highResolutionTerrain: true,
  },
  // Events and tokens for xhr
  isFetching: false,
  fetchingMapInfo: false,
  mapInfoCancelToken: null,
  fetchingColumnInfo: false,
  columnInfoCancelToken: null,
  fetchingXdd: false,
  xddCancelToken: null,
  xddInfo: [],
  isSearching: false,
  inputFocus: false,
  term: "",
  searchCancelToken: null,
  fetchingElevation: false,
  elevationCancelToken: null,
  fetchingPbdb: false,
  mapInfo: [],
  columnInfo: null,
  searchResults: null,
  pbdbData: [],
  mapIsLoading: false,
  mapCenter: {
    type: null,
  },
  mapUse3D: false,
  filtersOpen: false,
  filters: [],
  filteredColumns: {},
  data: [],
  showExperimentsPanel: false,
  timeCursorAge: null,
  plateModelId: 3,
  focusedMapSource: null,
  mapPosition: {
    camera: {
      lng: 23,
      lat: 16,
      altitude: 300000,
    },
  },
};

export function coreReducer(
  state: CoreState = defaultState,
  action: CoreAction
): CoreState {
  switch (action.type) {
    case "set-map-backend": {
      return { ...state, mapBackend: action.backend };
    }
    case "map-loading":
      if (state.mapIsLoading) return state;
      return { ...state, mapIsLoading: true };
    case "map-idle":
      if (!state.mapIsLoading) return state;
      return { ...state, mapIsLoading: false };
    case "map-layers-changed":
      let columnInfo = state.columnInfo;
      let pbdbData = state.pbdbData;
      if (!action.mapLayers.has(MapLayer.COLUMNS)) columnInfo = null;
      if (!action.mapLayers.has(MapLayer.FOSSILS)) pbdbData = [];
      return {
        ...state,
        columnInfo,
        pbdbData,
      };
    case "toggle-menu":
      const shouldOpen = state.inputFocus || !state.menuOpen;

      return {
        ...state,
        contextPanelOpen: shouldOpen,
        menuOpen: shouldOpen,
        isSearching: false,
        inputFocus: false,
      };
    case "stop-searching":
    case "context-outside-click":
      if (state.inputFocus) {
        return {
          ...state,
          inputFocus: false,
          contextPanelOpen: false,
          menuOpen: false,
          term: "",
        };
      }
      return state;
    case "toggle-about":
      return { ...state, aboutOpen: !state.aboutOpen };
    case "toggle-experiments-panel":
      return {
        ...state,
        showExperimentsPanel: action.open ?? !state.showExperimentsPanel,
      };
    case "close-infodrawer":
      return {
        ...state,
        infoDrawerOpen: false,
        infoMarkerPosition: null,
        columnInfo: {},
      };
    case "expand-infodrawer":
      return { ...state, infoDrawerExpanded: !state.infoDrawerExpanded };
    case "toggle-filters":
      // rework this to open menu panel
      return { ...state, filtersOpen: !state.filtersOpen };
    case "add-filter":
      // action.filter.type and action.filter.id go to the URI
      // handle search resetting
      return {
        ...coreReducer(state, { type: "stop-searching" }),
        filters: buildFilters(state.filters, [action.filter]),
      };
    case "set-filters":
      /* Set multiple filters at once, usually on app load. */
      return {
        ...state,
        filters: buildFilters(state.filters, action.filters),
      };
    case "remove-filter":
      return {
        ...state,
        filters: state.filters.filter((d) => {
          if (d.name != action.filter.name) return d;
        }),
      };
    case "clear-filters":
      return { ...state, filters: [] };
    case "start-map-query":
      // if (state.inputFocus) {
      //   return { ...state, inputFocus: false };
      // }
      if (state.mapInfoCancelToken) {
        state.mapInfoCancelToken.cancel();
      }
      return {
        ...state,
        infoMarkerPosition: {
          lng: action.lng,
          lat: action.lat,
        },
        fetchingMapInfo: true,
        infoDrawerOpen: true,
        mapInfoCancelToken: action.cancelToken,
      };
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

      return {
        ...state,
        fetchingMapInfo: false,
        mapInfo: action.data,
        infoDrawerOpen: true,
      };

    case "start-column-query":
      if (state.columnInfoCancelToken) {
        state.columnInfoCancelToken.cancel();
      }
      return {
        ...state,
        fetchingColumnInfo: true,
        columnInfo: null,
        columnInfoCancelToken: action.cancelToken,
      };

    case "set-all-columns":
      return { ...state, allColumns: action.columns };

    case "received-column-query":
      // summarize units
      if (state.allColumns == null || state.allColumns.length == 0) {
        return state;
      }
      return {
        ...state,
        fetchingColumnInfo: false,
        columnInfo: assembleColumnSummary(action.column, action.data),
      };
    case "clear-column-info":
      return { ...state, columnInfo: null, fetchingColumnInfo: false };
    case "toggle-map-layer":
      const op = state.mapLayers.has(action.layer) ? "$remove" : "$add";
      const mapLayers: Spec<Set<MapLayer>, any> = {
        [op]: [action.layer],
      };
      return update(state, { mapLayers });
    case "toggle-map-3d":
      return { ...state, mapUse3D: !state.mapUse3D };
    case "update-cross-section":
      return {
        ...state,
        crossSectionLine: action.line,
        crossSectionCursorLocation: [],
      };
    case "set-input-focus":
      return {
        ...state,
        term: action.inputFocus ? state.term : "",
        inputFocus: action.inputFocus,
        menuOpen: action.menuOpen ?? state.menuOpen,
        contextPanelOpen: action.inputFocus || action.menuOpen,
      };
    case "set-search-term":
      return { ...state, term: action.term };
    // Handle searching
    case "start-search-query":
      // When a search is requested, cancel any pending requests first
      if (state.searchCancelToken) {
        state.searchCancelToken.cancel();
      }
      return {
        ...state,
        isSearching: true,
        searchCancelToken: action.cancelToken,
      };
    case "received-search-query":
      return {
        ...state,
        isSearching: false,
        searchResults: action.data,
        searchCancelToken: null,
      };

    case "start-xdd-query":
      // When a search is requested, cancel any pending requests first
      if (state.xddCancelToken) {
        state.xddCancelToken.cancel();
      }
      return {
        ...state,
        fetchingXdd: true,
        xddCancelToken: action.cancelToken,
      };
    case "received-xdd-query":
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

      return {
        ...state,
        fetchingXdd: false,
        xddInfo: action.data,
        xddCancelToken: null,
      };

    case "update-elevation-marker":
      return { ...state, crossSectionCursorLocation: [action.lng, action.lat] };

    // Handle PBDB
    case "start-pbdb-query":
      return {
        ...state,
        fetchingPbdb: true,
      };

    case "received-pbdb-query":
      return {
        ...state,
        fetchingPbdb: false,
        pbdbData: action.data,
        infoDrawerOpen: true,
      };

    case "reset-pbdb":
      return { ...state, pbdbData: [] };
    case "go-to-place":
      return {
        ...coreReducer(state, { type: "set-input-focus", inputFocus: false }),
        mapCenter: {
          type: "place",
          place: action.place,
        },
      };
    case "update-column-filters":
      return {
        ...state,
        filteredColumns: action.columns,
      };
    case "request-data":
      return { ...state, isFetching: true };
    case "recieve-data":
      return { ...state, isFetching: false, data: action.data };
    case "map-moved":
      return {
        ...state,
        ...action.data,
      };
    case "toggle-high-resolution-terrain":
      return update(state, {
        mapSettings: { $toggle: ["highResolutionTerrain"] },
      });
    case "set-time-cursor":
      return { ...state, timeCursorAge: action.age };
    case "set-plate-model":
      return { ...state, plateModelId: action.plateModel };
    case "set-focused-map-source":
      let focusedMapSource = action.source_id;
      if (focusedMapSource === state.focusedMapSource) {
        focusedMapSource = null;
      }
      return { ...state, focusedMapSource };
    default:
      return state;
  }
}

function isTheSame(f: FilterData, newFilter: FilterData) {
  return (
    f.name === newFilter.name &&
    f.type === newFilter.type &&
    f.id === newFilter.id
  );
}

function isOverlappingType(f1: FilterData, f2: FilterData) {
  /* Check if the filter is the same type or including all_ */
  const t1 = f1.type.startsWith("all_") ? f1.type.replace("all_", "") : f1.type;
  const t2 = f2.type.startsWith("all_") ? f2.type.replace("all_", "") : f2.type;
  return f1.name === f2.name && t1 === t2 && f1.id === f2.id;
}

export function buildFilters(filters: FilterData[], newFilters: FilterData[]) {
  // Remove any existing filters of the same type
  const remainingFilters = filters.filter((f) => {
    return !newFilters.some((nf) => isOverlappingType(f, nf));
  });

  return [...remainingFilters, ...newFilters];
}
