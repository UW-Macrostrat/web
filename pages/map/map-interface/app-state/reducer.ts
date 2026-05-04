import { AppAction, CoreState, MapLayer } from "./types";
import update, { Spec } from "immutability-helper";
import { FilterData } from "./handlers/filters";
import { updateStateFromLocation } from "./navigation";

export { MapLayer };

const defaultState: CoreState = {
  initialLoadComplete: false,
  mapIsMoving: false,
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
  mapLayers: new Set([MapLayer.BEDROCK, MapLayer.LINES, MapLayer.LABELS]),
  mapSettings: {
    highResolutionTerrain: true,
  },
  // Events and tokens for xhr
  isFetching: false,
  columnInfoCancelToken: null,
  isSearching: false,
  inputFocus: false,
  term: "",
  searchCancelToken: null,
  fetchingElevation: false,
  elevationCancelToken: null,
  fetchingPbdb: false,
  searchResults: null,
  pbdbData: [],
  mapIsLoading: false,
  isShowingColumnPage: false,
  mapCenter: {
    type: null,
  },
  mapUse3D: false,
  filtersOpen: false,
  filters: [],
  filtersInfo: [],
  filteredColumns: null,
  activeMenuPage: null,
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

export function createInitialState() {
  return updateStateFromLocation(defaultState);
}

export function coreReducer(
  state: CoreState | null | undefined,
  action: AppAction
): CoreState {
  switch (action.type) {
    case "initial-load-complete":
      return { ...state, initialLoadComplete: true, filters: action.filters };
    case "set-location":
      console.log("Setting location to", action.location);
      return updateStateFromLocation(state, action.location);
    case "map-loading":
      if (state.mapIsLoading) return state;
      return { ...state, mapIsLoading: true };
    case "map-idle":
      if (!state.mapIsLoading) return state;
      return { ...state, mapIsLoading: false, mapIsMoving: false };
    case "set-menu-page":
      return { ...state, activeMenuPage: action.page };
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
    case "close-column-page":
      return { ...state, isShowingColumnPage: false };
    case "close-infodrawer":
      return {
        ...state,
        infoDrawerOpen: false,
        infoMarkerPosition: null,
        columnInfo: null,
        isShowingColumnPage: false,
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
      console.log("Starting map query", action);
      return {
        ...state,
        infoMarkerPosition: {
          lng: action.lng,
          lat: action.lat,
        },
        mapIsMoving: true,
        infoDrawerOpen: true,
      };
    case "set-all-columns":
      return { ...state, allColumns: action.columns };

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
    case "map-moved":
      return {
        ...state,
        mapIsMoving: false,
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

export * from "./hash-string";
export * from "./types";
