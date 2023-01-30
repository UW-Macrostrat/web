import { MapAction, MapLayer, MapState, PositionFocusState } from "../map";
import { CancelToken } from "axios";
export * from "../map";
import { AddFilter, FilterData } from "../../handlers/filters";

//////////// Async Actions ///////////////
type FETCH_SEARCH_QUERY = { type: "fetch-search-query"; term: string };
type ASYNC_ADD_FILTER = { type: "async-add-filter"; filter: any };
type GET_FILTERED_COLUMNS = { type: "get-filtered-columns" };
type FETCH_GDD = { type: "fetch-gdd" };
type MAP_QUERY = {
  type: "map-query" | "run-map-query";
  lng: number;
  lat: number;
  z: string | number;
  map_id: any;
  column: any;
};

type GET_COLUMN = { type: "get-column"; column: any };
type GET_ELEVATION = { type: "get-elevation"; line: any };
type GET_PBDB = { type: "get-pbdb"; collection_nos: any };
// Define constants to be passed with actions
type RECIEVE_DATA = { type: "recieve-data" };
type REQUEST_DATA = { type: "request-data" };

type TOGGLE_MENU = { type: "toggle-menu" };
type TOGGLE_ABOUT = { type: "toggle-about" };
type EXPAND_INFODRAWER = { type: "expand-infodrawer" };
type CLOSE_INFODRAWER = { type: "close-infodrawer" };
type TOGGLE_ELEVATION_CHART = { type: "toggle-elevation-chart" };

type TOGGLE_FILTERS = { type: "toggle-filters" };
type REMOVE_FILTER = { type: "remove-filter"; filter: any };
type UPDATE_COLUMN_FILTERS = { type: "update-column-filters"; columns: any };
type CLEAR_FILTERS = { type: "clear-filters" };
type RecenterQueryMarker = { type: "recenter-query-marker" };

type START_MAP_QUERY = {
  type: "start-map-query";
  lng: number;
  lat: number;
  cancelToken: any;
};
type RECEIVED_MAP_QUERY = { type: "received-map-query"; data: any };

type START_COLUMN_QUERY = { type: "start-column-query"; cancelToken: any };
type RECEIVED_COLUMN_QUERY = {
  type: "received-column-query";
  data: any;
  column: any;
};

type MAP_LAYERS_CHANGED = {
  type: "map-layers-changed";
  mapLayers: Set<MapLayer>;
};

type START_GDD_QUERY = { type: "start-gdd-query"; cancelToken: any };
type RECEIVED_GDD_QUERY = { type: "received-gdd-query"; data: any };

type START_PBDB_QUERY = { type: "start-pbdb-query" };
type RECEIVED_PBDB_QUERY = { type: "received-pbdb-query"; data: any };
type RESET_PBDB = { type: "reset-pbdb" };

type SET_INPUT_FOCUS = {
  type: "set-input-focus";
  inputFocus: boolean;
  menuOpen?: boolean;
};

type CONTEXT_OUTSIDE_CLICK = {
  type: "context-outside-click";
};

type SET_SEARCH_TERM = {
  type: "set-search-term";
  term: string;
};
type START_SEARCH_QUERY = {
  type: "start-search-query";
  term: string;
  cancelToken: any;
};
type RECEIVED_SEARCH_QUERY = { type: "received-search-query"; data: any };
type GO_TO_PLACE = { type: "go-to-place"; place: any };

type START_ELEVATION_QUERY = {
  type: "start-elevation-query";
  cancelToken: any;
};
type RECEIVED_ELEVATION_QUERY = { type: "received-elevation-query"; data: any };
type UPDATE_ELEVATION_MARKER = {
  type: "update-elevation-marker";
  lng: number;
  lat: number;
};

type SET_ACTIVE_INDEX_MAP = { type: "set-active-index-map" };

type UPDATE_STATE = { type: "update-state"; state: any };

type ToggleHighResolutionTerrain = { type: "toggle-high-resolution-terrain" };

export type CoreAction =
  | MAP_LAYERS_CHANGED
  | CLEAR_FILTERS
  | SET_INPUT_FOCUS
  | SET_SEARCH_TERM
  | GET_PBDB
  | GET_ELEVATION
  | GET_COLUMN
  | MAP_QUERY
  | FETCH_GDD
  | UPDATE_STATE
  | GET_FILTERED_COLUMNS
  | ASYNC_ADD_FILTER
  | FETCH_SEARCH_QUERY
  | CONTEXT_OUTSIDE_CLICK
  | RECIEVE_DATA
  | REQUEST_DATA
  | TOGGLE_MENU
  | TOGGLE_ABOUT
  | EXPAND_INFODRAWER
  | CLOSE_INFODRAWER
  | TOGGLE_ELEVATION_CHART
  | TOGGLE_FILTERS
  | REMOVE_FILTER
  | UPDATE_COLUMN_FILTERS
  | START_MAP_QUERY
  | RECEIVED_MAP_QUERY
  | START_COLUMN_QUERY
  | RECEIVED_COLUMN_QUERY
  | START_GDD_QUERY
  | RECEIVED_GDD_QUERY
  | START_PBDB_QUERY
  | RECEIVED_PBDB_QUERY
  | RESET_PBDB
  | START_SEARCH_QUERY
  | RECEIVED_SEARCH_QUERY
  | GO_TO_PLACE
  | START_ELEVATION_QUERY
  | RECEIVED_ELEVATION_QUERY
  | UPDATE_ELEVATION_MARKER
  | SET_ACTIVE_INDEX_MAP
  | MapAction
  | RecenterQueryMarker
  | ToggleHighResolutionTerrain
  | AddFilter;

interface AsyncRequestState {
  // Events and tokens for xhr
  // NOTE: we should really improve some of this token infrastructure
  fetchingMapInfo: boolean;
  fetchingColumnInfo: boolean;
  fetchingGdd: boolean;
  isSearching: boolean;
  term: string;
  fetchingElevation: boolean;
  fetchingPbdb: boolean;
  mapInfoCancelToken: CancelToken | null;
  columnInfoCancelToken: CancelToken | null;
  gddCancelToken: CancelToken | null;
  searchCancelToken: CancelToken | null;
  elevationCancelToken: CancelToken | null;
}

interface MapCenterInfo {
  type: string;
  [key: string]: any;
}

interface MapSettings {
  highResolutionTerrain: boolean;
  showLineSymbols: boolean;
}

export interface CoreState extends MapState, AsyncRequestState {
  initialLoadComplete: boolean;
  contextPanelOpen: boolean;
  menuOpen: boolean;
  aboutOpen: boolean;
  infoDrawerOpen: boolean;
  infoDrawerExpanded: boolean;
  isFetching: boolean;
  elevationChartOpen: boolean;
  infoMarkerPosition: { lat: number; lng: number } | null;
  infoMarkerFocus: PositionFocusState | null;
  mapInfo: any[];
  mapSettings: MapSettings;
  columnInfo: object;
  gddInfo: any[];
  searchResults: any;
  elevationData: any;
  inputFocus: boolean;
  elevationMarkerLocation: any;
  pbdbData: any[];
  mapCenter: MapCenterInfo;
  mapUse3D: boolean;
  filtersOpen: boolean;
  filters: FilterData[];
  filteredColumns: object;
  data: [];
}
