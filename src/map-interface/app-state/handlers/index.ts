import {
  doSearchAsync,
  fetchFilteredColumns,
  getAsyncGdd,
  asyncGetColumn,
  asyncQueryMap,
  asyncGetElevation,
  getPBDBData,
} from "./fetch";
import { Action, CoreState } from "../sections";
import axios from "axios";
import { asyncFilterHandler } from "./filters";
import { updateStateFromURI } from "../helpers";

function getCancelToken() {
  let CancelToken = axios.CancelToken;
  let source = CancelToken.source();
  return source;
}

async function actionRunner(
  state: CoreState,
  action: Action,
  dispatch = null
): Promise<Action | void> {
  switch (action.type) {
    case "get-initial-map-state":
      return updateStateFromURI(state);
    case "fetch-search-query":
      let term = action.term;
      let CancelToken = axios.CancelToken;
      let source = CancelToken.source();
      dispatch({
        type: "start-search-query",
        term,
        cancelToken: source,
      });
      const data = await doSearchAsync(term, source.token);
      return { type: "received-search-query", data };
    case "fetch-gdd":
      const { mapInfo } = state;
      let CancelToken1 = axios.CancelToken;
      let source1 = CancelToken1.source();
      dispatch({
        type: "start-gdd-query",
        cancelToken: source1,
      });
      const gdd_data = await getAsyncGdd(mapInfo, source1.token);
      return { type: "received-gdd-query", data: gdd_data };
    case "async-add-filter":
      let filter = action.filter;
      const filterAction = await asyncFilterHandler(filter);
      return filterAction;
    case "get-filtered-columns":
      let filteredColumns = await fetchFilteredColumns(state.filters);
      return {
        type: "update-column-filters",
        columns: filteredColumns,
      };
    case "map-query":
      const { lng, lat, z, map_id, column } = action;
      let CancelTokenMapQuery = axios.CancelToken;
      let sourceMapQuery = CancelTokenMapQuery.source();
      if (state.inputFocus && state.contextPanelOpen) {
        return { type: "context-outside-click" };
      }

      dispatch({
        type: "start-map-query",
        lng,
        lat,
        cancelToken: sourceMapQuery,
      });
      if (column) {
        dispatch(
          await actionRunner(state, { type: "get-column", column }, dispatch)
        );
      }
      let mapData = await asyncQueryMap(
        lng,
        lat,
        z,
        map_id,
        sourceMapQuery.token
      );
      state.infoMarkerLng = lng.toFixed(4);
      state.infoMarkerLat = lat.toFixed(4);
      return {
        type: "received-map-query",
        data: mapData,
      };
    case "get-column":
      let CancelTokenGetColumn = axios.CancelToken;
      let sourceGetColumn = CancelTokenGetColumn.source();
      dispatch({ type: "start-column-query", cancelToken: sourceMapQuery });

      let columnData = await asyncGetColumn(
        action.column,
        sourceGetColumn.token
      );
      return {
        type: "received-column-query",
        data: columnData,
        column: action.column,
      };
    case "get-elevation":
      let CancelTokenElevation = axios.CancelToken;
      let sourceElevation = CancelTokenElevation.source();
      dispatch({
        type: "start-elevation-query",
        cancelToken: sourceElevation.token,
      });
      const elevationData = await asyncGetElevation(
        action.line,
        sourceElevation
      );
      return {
        type: "received-elevation-query",
        data: elevationData,
      };
    case "get-pbdb":
      let collection_nos = action.collection_nos;
      dispatch({ type: "start-pdbd-query" });
      return {
        type: "received-pbdb-query",
        data: await getPBDBData(collection_nos),
      };
    default:
      return action;
  }
}

export default actionRunner;
