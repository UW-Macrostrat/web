import axios from "axios";
import { SETTINGS } from "../Settings";
import { useDispatch } from "react-redux";

//////////// Async Actions ///////////////
type FETCH_SEARCH_QUERY = { type: "fetch-search-query"; term: string };
type ASYNC_ADD_FILTER = { type: "async-add-filter"; filter: any };
type GET_FILTERED_COLUMNS = { type: "get-filtered-columns"; filter: any };
type FETCH_GDD = { type: "fetch-gdd" };
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
type REMOVE_FILTER = { type: "remove-filter" };
type UPDATE_COLUMN_FILTERS = { type: "update-column-filters"; columns: any };

type START_MAP_QUERY = {
  type: "start-map-query";
  lng: number;
  lat: number;
  cancelToken: any;
};
type RECEIVED_MAP_QUERY = { type: "received-map-query" };

type START_COLUMN_QUERY = { type: "start-column-query"; cancelToken: any };
type RECEIVED_COLUMN_QUERY = { type: "received-column-query" };

type START_GDD_QUERY = { type: "start-gdd-query"; cancelToken: any };
type RECEIVED_GDD_QUERY = { type: "received-gdd-query"; data: any };

type START_PBDB_QUERY = { type: "start-pbdb-query"; cancelToken: any };
type UPDATE_PBDB_QUERY = { type: "update-pbdb-query" };
type RECEIVED_PBDB_QUERY = { type: "received-pbdb-query" };
type RESET_PBDB = { type: "reset-pbdb" };

type TOGGLE_BEDROCK = { type: "toggle-bedrock" };
type TOGGLE_LINES = { type: "toggle-lines" };
type TOGGLE_SATELLITE = { type: "toggle-satellite" };
type TOGGLE_COLUMNS = { type: "toggle-columns" };
type TOGGLE_FOSSILS = { type: "toggle-fossils" };

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
type RECEIVED_ELEVATION_QUERY = { type: "received-elevation-query" };
type UPDATE_ELEVATION_MARKER = { type: "update-elevation-marker" };

type SET_ACTIVE_INDEX_MAP = { type: "set-active-index-map" };

type MAP_MOVED = { type: "map-moved" };
type GET_INITIAL_MAP_STATE = { type: "get-initial-map-state" };
type GOT_INITIAL_MAP_STATE = { type: "got-initial-map-state" };
type SET_MAP_BACKEND = { type: "set-map-backend"; backend: any };

type UPDATE_STATE = { type: "update-state"; state: any };

export type Action =
  | FETCH_GDD
  | UPDATE_STATE
  | GET_FILTERED_COLUMNS
  | ASYNC_ADD_FILTER
  | SET_MAP_BACKEND
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
  | MAP_MOVED
  | GET_INITIAL_MAP_STATE
  | GOT_INITIAL_MAP_STATE;

// Define action functions
export const toggleMenu = () => {
  return {
    type: "toggle-menu",
  };
};
export const toggleAbout = () => {
  return {
    type: "toggle-about",
  };
};
export const toggleInfoDrawer = () => {
  return {
    type: "toggle-infodrawer",
  };
};
export const closeInfoDrawer = () => {
  return {
    type: "close-infodrawer",
  };
};
export const expandInfoDrawer = () => {
  return {
    type: "expand-infodrawer",
  };
};
export const toggleFilters = () => {
  return {
    type: "toggle-filters",
  };
};

export const toggleBedrock = () => {
  return {
    type: "toggle-bedrock",
  };
};

export const toggleLines = () => {
  return {
    type: "toggle-lines",
  };
};

export const toggleElevationChart = () => {
  return {
    type: "toggle-elevation-chart",
  };
};

export const toggleSatellite = () => {
  return {
    type: "toggle-satellite",
  };
};
export const toggleColumns = () => {
  return {
    type: "toggle-columns",
  };
};

export const toggleFossils = () => {
  return {
    type: "toggle-fossils",
  };
};

export function requestData() {
  return {
    type: "request-data",
  };
}

export function recieveData(json) {
  return {
    type: "recieve-data",
    data: json,
  };
}

export function startMapQuery(data, cancelToken) {
  return {
    type: "start-map-query",
    lng: data.lng,
    lat: data.lat,
    cancelToken: cancelToken,
  };
}

export function receivedMapQuery(data) {
  return {
    type: "received-map-query",
    data: data,
  };
}

function addMapIdToRef(data) {
  data.success.data.mapData = data.success.data.mapData.map((source) => {
    source.ref.map_id = source.map_id;
    return source;
  });
  return data;
}

export const queryMap = (lng, lat, z, map_id, column) => {
  return (dispatch) => {
    let CancelToken = axios.CancelToken;
    let source = CancelToken.source();

    if (column) {
      dispatch(getColumn(column));
    }

    dispatch(startMapQuery({ lng: lng, lat: lat }, source));
    let url = `${
      SETTINGS.apiDomain
    }/api/v2/mobile/map_query_v2?lng=${lng.toFixed(5)}&lat=${lat.toFixed(
      5
    )}&z=${parseInt(z)}`;
    if (map_id) {
      url += `&map_id=${map_id}`;
    }
    return axios
      .get(url, {
        cancelToken: source.token,
        responseType: "json",
      })
      .then((json) => addMapIdToRef(json.data))
      .then((json) => dispatch(receivedMapQuery(json.success.data)))
      .catch((error) => {
        // don't care 💁
      });
  };
};

export function shouldFetchColumn(data) {
  if (data.success.data && data.success.data.hasColumns) {
    getColumn();
  }
  return data;
}

export function removeFilter(theFilter) {
  return {
    type: "remove-filter",
    filter: theFilter,
  };
}

export function startColumnQuery(cancelToken) {
  return {
    type: "start-column-query",
    cancelToken: cancelToken,
  };
}

export const getColumn = (column) => {
  return (dispatch, getState) => {
    let CancelToken = axios.CancelToken;
    let source = CancelToken.source();

    dispatch(startColumnQuery(source));

    return axios
      .get(
        `${SETTINGS.apiDomain}/api/v2/units?response=long&col_id=${column.col_id}`,
        {
          cancelToken: source.token,
          responseType: "json",
        }
      )
      .then((json) =>
        dispatch(receivedColumnQuery(json.data.success.data, column))
      )
      .catch((error) => {
        // don't care 💁
      });
  };
};

export function receivedColumnQuery(data, column) {
  return {
    type: "received-column-query",
    data: data,
    column: column,
  };
}

export function startElevationQuery(cancelToken) {
  return {
    type: "start-elevation-query",
    cancelToken: cancelToken,
  };
}
export const getElevation = (line) => {
  return (dispatch) => {
    let CancelToken = axios.CancelToken;
    let source = CancelToken.source();

    dispatch(startElevationQuery(source));

    return axios
      .get(
        `${SETTINGS.apiDomain}/api/v2/elevation?start_lng=${line[0][0]}&start_lat=${line[0][1]}&end_lng=${line[1][0]}&end_lat=${line[1][1]}`,
        {
          cancelToken: source.token,
          responseType: "json",
        }
      )
      .then((json) => dispatch(receivedElevationQuery(json.data.success.data)))
      .catch((error) => {
        // don't care 💁
        dispatch(receivedElevationQuery([]));
      });
  };
};

export function receivedElevationQuery(data) {
  return {
    type: "received-elevation-query",
    data: data,
  };
}

export function updateElevationMarker(lng, lat) {
  return {
    type: "update-elevation-marker",
    lng: lng,
    lat: lat,
  };
}

export function startPbdbQuery(cancelToken) {
  return {
    type: "start-pbdb-query",
    cancelToken: cancelToken,
  };
}

export function updatePbdbQuery(cancelToken) {
  return {
    type: "update-pbdb-query",
    cancelToken: cancelToken,
  };
}

export const resetPbdb = () => {
  return {
    type: "reset-pbdb",
  };
};

export const getPBDB = (collection_nos) => {
  return (dispatch) => {
    let CancelToken = axios.CancelToken;
    let source = CancelToken.source();

    dispatch(startPbdbQuery(source));

    return axios
      .get(
        `${
          SETTINGS.pbdbDomain
        }/data1.2/colls/list.json?id=${collection_nos.join(
          ","
        )}&show=ref,time,strat,geo,lith,entname,prot&markrefs`,
        {
          cancelToken: source.token,
          responseType: "json",
        }
      )
      .then((collectionResponse) => {
        let CancelToken2 = axios.CancelToken;
        let source2 = CancelToken.source();

        dispatch(updatePbdbQuery(source2));

        axios
          .get(
            `${
              SETTINGS.pbdbDomain
            }/data1.2/occs/list.json?coll_id=${collection_nos.join(
              ","
            )}&show=phylo,ident`
          )
          .then((occurrenceResponse) => {
            let occurrences = occurrenceResponse.data.records;

            let collections = collectionResponse.data.records.map((col) => {
              col.occurrences = [];

              occurrences.forEach((occ) => {
                if (occ.cid === col.oid) {
                  col.occurrences.push(occ);
                }
              });
              return col;
            });

            dispatch(receivedPbdbQuery(collections));
          });
      })
      .catch((error) => {
        // don't care 💁
        dispatch(receivedPbdbQuery([]));
      });
  };
};

export function receivedPbdbQuery(data) {
  return {
    type: "received-pbdb-query",
    data: data,
  };
}

export function mapMoved(data) {
  return {
    type: "map-moved",
    data: data,
  };
}

export function gotInitialMapState(mapState) {
  return {
    type: "got-initial-map-state",
    data: mapState,
  };
}

export function startGeolocation() {}

export function askForGeolocationPermissions() {}

export function receivedGeolocationPermissions() {}

export function goToUserLocation() {}

export function wentToUserLocation() {}

export function useActionDispatch(): React.Dispatch<Action> {
  return useDispatch<React.Dispatch<Action>>();
}
