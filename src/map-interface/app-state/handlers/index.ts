import {
  fetchFilteredColumns,
  getAsyncGdd,
  asyncGetColumn,
  asyncQueryMap,
  asyncGetElevation,
  getPBDBData,
  base,
} from "./fetch";
import { AppAction, AppState } from "../reducers";
import axios from "axios";
import { runFilter } from "./filters";
import { push } from "@lagunovsky/redux-react-router";
import { routerBasename } from "~/map-interface/Settings";
import { isDetailPanelRoute } from "../nav-hooks";
import { MenuPage, setInfoMarkerPosition } from "../reducers";
import { formatCoordForZoomLevel } from "~/map-interface/utils/formatting";
import { currentPageForPathName } from "../nav-hooks";
import { getInitialStateFromHash } from "../reducers/hash-string";

async function actionRunner(
  state: AppState,
  action: AppAction,
  dispatch = null
): Promise<AppAction | void> {
  const coreState = state.core;
  switch (action.type) {
    case "get-initial-map-state": {
      const { pathname } = state.router.location;
      let s1 = setInfoMarkerPosition(state);
      let coreState = s1.core;

      const activePage = currentPageForPathName(pathname);

      // Harvest as much information as possible from the hash string
      let [coreState1, filters] = getInitialStateFromHash(
        coreState,
        state.router.location.hash
      );

      // Fill out the remainder with defaults

      dispatch({
        type: "replace-state",
        state: {
          ...state,
          core: {
            ...coreState1,
            initialLoadComplete: true,
          },
          menu: { activePage },
        },
      });

      // Apply all filters in parallel
      const newFilters = await Promise.all(
        filters.map((f) => {
          return runFilter(f);
        })
      );
      // Then reload the map by faking a layer change event
      return { type: "set-filters", filters: newFilters };
      // return {
      //   type: "map-layers-changed",
      //   mapLayers: coreState1.mapLayers,
      // };
    }
    case "toggle-menu": {
      // Push the menu onto the history stack
      let activePage = state.menu.activePage;
      if (activePage != null) {
        activePage = null;
      } else {
        activePage = MenuPage.LAYERS;
      }
      return await actionRunner(
        state,
        { type: "set-menu-page", page: activePage },
        dispatch
      );
    }
    case "set-menu-page": {
      const { pathname } = state.router.location;
      if (!isDetailPanelRoute(pathname)) {
        const newPathname = "/" + (action.page ?? "");
        await dispatch(push({ pathname: newPathname, hash: location.hash }));
      }
      return { type: "set-menu-page", page: action.page };
    }
    case "close-infodrawer":
      const pathname = routerBasename + (state.menu.activePage ?? "");
      await dispatch(push({ pathname, hash: location.hash }));
      return action;
    case "fetch-search-query":
      const { term } = action;
      let CancelToken = axios.CancelToken;
      let source = CancelToken.source();
      dispatch({
        type: "start-search-query",
        term,
        cancelToken: source,
      });
      const res = await axios.get(base + "/mobile/autocomplete", {
        params: {
          include: "interval,lithology,environ,strat_name",
          query: term,
        },
        cancelToken: source.token,
        responseType: "json",
      });
      return { type: "received-search-query", data: res.data.success.data };
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
      return { type: "add-filter", filter: await runFilter(action.filter) };
    case "get-filtered-columns":
      return {
        type: "update-column-filters",
        columns: await fetchFilteredColumns(coreState.filters),
      };
    case "map-query": {
      const { lng, lat, z } = action;
      const ln = formatCoordForZoomLevel(lng, Number(z));
      const lt = formatCoordForZoomLevel(lat, Number(z));
      return push({
        pathname: routerBasename + `loc/${ln}/${lt}`,
        hash: location.hash,
      });
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
