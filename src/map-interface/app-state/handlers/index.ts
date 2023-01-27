import {
  doSearchAsync,
  fetchFilteredColumns,
  getAsyncGdd,
  asyncGetColumn,
  asyncQueryMap,
  asyncGetElevation,
  getPBDBData,
} from "./fetch";
import { Action, AppState } from "../sections";
import axios from "axios";
import { asyncFilterHandler } from "./filters";
import { updateMapPositionForHash } from "../helpers";
import { push } from "@lagunovsky/redux-react-router";
import { routerBasename } from "~/map-interface/Settings";

function getCancelToken() {
  let CancelToken = axios.CancelToken;
  let source = CancelToken.source();
  return source;
}

async function actionRunner(
  state: AppState,
  action: Action,
  dispatch = null
): Promise<Action | void> {
  const coreState = state.core;
  switch (action.type) {
    case "get-initial-map-state":
      return updateMapPositionForHash(coreState, state.router.location.hash);
    case "toggle-menu":
      // Push the menu onto the history stack
      const isRootRoute = state.router.location.pathname == routerBasename;
      const goToLayersPage = push(routerBasename + "layers" + location.hash);
      if (state.core.inputFocus) {
        if (isRootRoute) {
          dispatch(goToLayersPage);
        }
        return { type: "set-input-focus", inputFocus: false };
      }
      if (isRootRoute) {
        return goToLayersPage;
      }
      return push(routerBasename + location.hash);
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
      const { mapInfo } = coreState;
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
      let filteredColumns = await fetchFilteredColumns(coreState.filters);
      return {
        type: "update-column-filters",
        columns: filteredColumns,
      };
    case "map-query": {
      const { lng, lat } = action;
      return push(
        routerBasename +
          `pos/${lng.toFixed(4)}/${lat.toFixed(4)}/` +
          location.hash
      );
      //return { ...action, type: "run-map-query" };
    }
    case "run-map-query":
      const { lng, lat, z, map_id, column } = action;
      let CancelTokenMapQuery = axios.CancelToken;
      let sourceMapQuery = CancelTokenMapQuery.source();
      if (coreState.inputFocus && coreState.contextPanelOpen) {
        // Dismiss the current context panel
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
      coreState.infoMarkerPosition = { lng, lat };
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
