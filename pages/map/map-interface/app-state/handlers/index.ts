import axios from "axios";
import { AppAction, MenuPage, MapLayer } from "../types";
import {
  base,
  fetchAllColumns,
  fetchFilteredColumns,
  getPBDBData,
} from "./fetch";
import { runFilter } from "./filters";

import { LineString } from "geojson";
import { StateGetter } from "../store";

export async function actionRunner(
  getState: StateGetter,
  action: AppAction,
  dispatch = null
): Promise<AppAction | void> {
  switch (action.type) {
    case "get-initial-map-state": {
      fetchAllColumns().then((res) => {
        runAsyncAction(
          getState,
          {
            type: "set-all-columns",
            columns: res,
          },
          dispatch
        );
      });

      const state = getState();
      const filters = await Promise.all(
        state.filtersInfo.map((f) => {
          return runFilter(f);
        })
      );
      return { type: "initial-load-complete", filters };
    }
    case "map-layers-changed": {
      const state = getState();
      const { mapLayers } = action;
      if (mapLayers.has(MapLayer.COLUMNS) && state.allColumns == null) {
        const columns = await fetchAllColumns();
        return { type: "set-all-columns", columns };
      } else {
        return null;
      }
    }
    case "set-all-columns":
      return action;
    case "toggle-menu": {
      const state = getState();
      // Push the menu onto the history stack
      let activePage = state.activeMenuPage;
      // If input is focused we want to open the menu if clicked, not run the toggle action.
      if (activePage != null && !state.inputFocus) {
        activePage = null;
      } else {
        activePage = MenuPage.LAYERS;
      }
      return await actionRunner(
        getState,
        { type: "set-menu-page", page: activePage },
        dispatch
      );
    }
    case "go-to-experiments-panel": {
      await dispatch({ type: "toggle-experiments-panel", open: true });
      return await actionRunner(
        getState,
        { type: "set-menu-page", page: MenuPage.SETTINGS },
        dispatch
      );
    }
    case "toggle-cross-section": {
      const state = getState();
      let line: LineString | null = null;
      if (state.crossSectionLine == null) {
        line = { type: "LineString", coordinates: [] };
      }
      const action: AppAction = {
        type: "update-cross-section",
        line,
      };
      return actionRunner(getState, action, dispatch);
    }
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
    case "select-search-result":
      const { result } = action;
      if (result.type == "place") {
        return { type: "go-to-place", place: result };
      } else {
        return actionRunner(
          getState,
          { type: "async-add-filter", filter: result },
          dispatch
        );
      }
    case "async-add-filter":
      return { type: "add-filter", filter: await runFilter(action.filter) };
    case "get-filtered-columns":
      const filters = getState((state) => state.filters);
      return await fetchFilteredColumns(filters);
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

async function runAsyncAction(
  getState: StateGetter,
  action: AppAction,
  dispatch: any
) {
  const res = await actionRunner(getState, action, dispatch);
  if (res != null) dispatch(res);
}
