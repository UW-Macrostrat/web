import { CoreState, MapLayer, AppAction, AppState } from "./types";
import update, { Spec } from "immutability-helper";
import { FilterData } from "../handlers/filters";
import { assembleColumnSummary } from "../handlers/columns";
import { createBrowserHistory } from "history";
import {
  contextPanelIsInitiallyOpen,
  currentPageForPathName,
} from "../nav-hooks";
import { getInitialStateFromHash, hashStringReducer } from "./hash-string";
import { matchPath } from "react-router";
import { mapPagePrefix } from "@macrostrat-web/settings";

export { MapLayer };

export const browserHistory = createBrowserHistory();

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
  filtersInfo: [],
  filteredColumns: null,
  activeMenuPage: null,
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

function createInitialState() {
  const route = browserHistory.location;
  const { pathname, hash } = route;
  const isOpen = contextPanelIsInitiallyOpen(pathname);
  const activeMenuPage = currentPageForPathName(pathname);
  const s1 = setInfoMarkerPosition(defaultState, pathname);
  const [coreState, filters] = getInitialStateFromHash(s1, hash);

  return {
    ...s1,
    ...coreState,
    filtersInfo: filters,
    menuOpen: isOpen,
    contextPanelOpen: isOpen,
    activeMenuPage,
  };
}

export function coreReducer(
  state: CoreState | null | undefined,
  action: AppAction
): CoreState {
  if (state == null) return createInitialState();
  switch (action.type) {
    case "initial-load-complete":
      return { ...state, initialLoadComplete: true, filters: action.filters };
    case "map-loading":
      if (state.mapIsLoading) return state;
      return { ...state, mapIsLoading: true };
    case "map-idle":
      if (!state.mapIsLoading) return state;
      return { ...state, mapIsLoading: false };
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
    case "close-infodrawer":
      return {
        ...state,
        infoDrawerOpen: false,
        infoMarkerPosition: null,
        columnInfo: null,
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
      if (
        state.mapInfoCancelToken &&
        state.mapInfoCancelToken != action.cancelToken
      ) {
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
      let mapInfo = null;
      if (action.data != null) {
        mapInfo = {
          ...action.data,
          mapData: preprocessMapData(action.data?.mapData),
        };
      }
      return {
        ...state,
        fetchingMapInfo: false,
        mapInfo,
        infoDrawerOpen: true,
      };
    case "start-column-query":
      if (
        state.columnInfoCancelToken &&
        state.columnInfoCancelToken != action.cancelToken
      ) {
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

function preprocessMapData(mapData) {
  /** Preprocess map data types */
  if (mapData == null) return null;
  return mapData.map((source) => {
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
        source.macrostrat.lith_types = Object.keys(types).map((l) => types[l]);
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
        source.macrostrat.econ_types = Object.keys(types).map((l) => types[l]);
      }
    }

    return source;
  });
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

export function setInfoMarkerPosition(
  state: AppState,
  pathname: string | null = null
): AppState {
  // Check if we are viewing a specific location
  const loc = matchPath(
    mapPagePrefix + "/loc/:lng/:lat/*",
    pathname ?? browserHistory.location.pathname
  );

  let s1 = state;

  if (loc != null) {
    const { lng, lat } = loc.params;
    return {
      ...s1,
      infoMarkerPosition: { lng: Number(lng), lat: Number(lat) },
      infoDrawerOpen: true,
    };
  }

  // Check if we're viewing a cross-section
  const crossSection = matchPath(
    mapPagePrefix + "/cross-section/:loc1/:loc2",
    pathname ?? browserHistory.location.pathname
  );
  if (crossSection != null) {
    const { loc1, loc2 } = crossSection.params;
    const [lng1, lat1] = loc1.split(",").map(Number);
    const [lng2, lat2] = loc2.split(",").map(Number);
    if (lng1 != null && lat1 != null && lng2 != null && lat2 != null) {
      return {
        ...s1,
        crossSectionLine: {
          type: "LineString",
          coordinates: [
            [lng1, lat1],
            [lng2, lat2],
          ],
        },
        crossSectionOpen: true,
      };
    }
  }

  return state;
}
