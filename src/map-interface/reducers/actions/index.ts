import { useDispatch } from "react-redux";
import { MapAction } from "./map-state";
import { PerformanceAction } from "../../map-page/performance";

//////////// Async Actions ///////////////
type FETCH_SEARCH_QUERY = { type: "fetch-search-query"; term: string };
type ASYNC_ADD_FILTER = { type: "async-add-filter"; filter: any };
type GET_FILTERED_COLUMNS = { type: "get-filtered-columns" };
type FETCH_GDD = { type: "fetch-gdd" };
type MAP_QUERY = {
  type: "map-query";
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
type PAGE_CLICK = { type: "page-click" };
type RECIEVE_DATA = { type: "recieve-data" };
type REQUEST_DATA = { type: "request-data" };

type TOGGLE_MENU = { type: "toggle-menu" };
type TOGGLE_ABOUT = { type: "toggle-about" };
type TOGGLE_INFODRAWER = { type: "toggle-infodrawer" };
type EXPAND_INFODRAWER = { type: "expand-infodrawer" };
type CLOSE_INFODRAWER = { type: "close-infodrawer" };
type TOGGLE_ELEVATION_CHART = { type: "toggle-elevation-chart" };

type TOGGLE_FILTERS = { type: "toggle-filters" };
type ADD_FILTER = { type: "add-filter"; filter: any };
type REMOVE_FILTER = { type: "remove-filter"; filter: any };
type UPDATE_COLUMN_FILTERS = { type: "update-column-filters"; columns: any };
type CLEAR_FILTERS = { type: "clear-filters" };

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

type START_GDD_QUERY = { type: "start-gdd-query"; cancelToken: any };
type RECEIVED_GDD_QUERY = { type: "received-gdd-query"; data: any };

type START_PBDB_QUERY = { type: "start-pbdb-query"; cancelToken: any };
type UPDATE_PBDB_QUERY = { type: "update-pbdb-query"; cancelToken: any };
type RECEIVED_PBDB_QUERY = { type: "received-pbdb-query"; data: any };
type RESET_PBDB = { type: "reset-pbdb" };

type TOGGLE_BEDROCK = { type: "toggle-bedrock" };
type TOGGLE_LINES = { type: "toggle-lines" };
type TOGGLE_SATELLITE = { type: "toggle-satellite" };
type TOGGLE_COLUMNS = { type: "toggle-columns" };
type TOGGLE_FOSSILS = { type: "toggle-fossils" };

type SET_INPUT_FOCUS = {
  type: "set-input-focus";
  inputFocus: boolean;
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

export type Action =
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
  | PAGE_CLICK
  | RECIEVE_DATA
  | REQUEST_DATA
  | TOGGLE_MENU
  | TOGGLE_ABOUT
  | TOGGLE_INFODRAWER
  | EXPAND_INFODRAWER
  | CLOSE_INFODRAWER
  | TOGGLE_ELEVATION_CHART
  | TOGGLE_FILTERS
  | ADD_FILTER
  | REMOVE_FILTER
  | UPDATE_COLUMN_FILTERS
  | START_MAP_QUERY
  | RECEIVED_MAP_QUERY
  | START_COLUMN_QUERY
  | RECEIVED_COLUMN_QUERY
  | START_GDD_QUERY
  | RECEIVED_GDD_QUERY
  | START_PBDB_QUERY
  | UPDATE_PBDB_QUERY
  | RECEIVED_PBDB_QUERY
  | RESET_PBDB
  | TOGGLE_BEDROCK
  | TOGGLE_LINES
  | TOGGLE_SATELLITE
  | TOGGLE_COLUMNS
  | TOGGLE_FOSSILS
  | START_SEARCH_QUERY
  | RECEIVED_SEARCH_QUERY
  | GO_TO_PLACE
  | START_ELEVATION_QUERY
  | RECEIVED_ELEVATION_QUERY
  | UPDATE_ELEVATION_MARKER
  | SET_ACTIVE_INDEX_MAP
  | MapAction
  | PerformanceAction;

export function useActionDispatch(): React.Dispatch<Action> {
  return useDispatch<React.Dispatch<Action>>();
}

export * from "./map-state";
export * from "./fetch";
