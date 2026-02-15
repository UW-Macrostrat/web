import axios from "axios";
import {
  AppAction,
  AppState,
  MenuPage,
  setInfoMarkerPosition,
} from "../reducers";
import {
  base,
  fetchAllColumns,
  fetchFilteredColumns,
  getPBDBData,
  handleXDDQuery,
  runColumnQuery,
  runMapQuery,
} from "./fetch";
import { runFilter } from "./filters";

import { LineString } from "geojson";
import { currentPageForPathName, isDetailPanelRoute } from "../nav-hooks";
import { MapLayer } from "../reducers/core";
import { getInitialStateFromHash } from "../reducers/hash-string";
import {
  ColumnGeoJSONRecord,
  ColumnSummary,
  ColumnProperties,
  findColumnsForLocation,
} from "./columns";

export default async function actionRunner(
  state: AppState,
  action: AppAction,
  dispatch = null
): Promise<AppAction | void> {
  const coreState = state.core;

  switch (action.type) {
    case "get-initial-map-state": {
      // Harvest as much information as possible from the hash string
      // If we are on the column route, the column layer must be enabled
      // const colMatch = matchPath(
      //   mapPagePrefix + "/loc/:lng/:lat/column",
      //   pathname
      // );
      // if (colMatch != null) {
      //   coreState1.mapLayers.add(MapLayer.COLUMNS);
      // }

      // Fill out the remainder with defaults

      // We always get all columns on initial load, which might be
      // a bit unnecessary and slow.
      //let allColumns: ColumnGeoJSONRecord[] | null = await fetchAllColumns();

      fetchAllColumns().then((res) => {
        runAsyncAction(
          state,
          {
            type: "set-all-columns",
            columns: res,
          },
          dispatch
        );
      });

      if (state.core.infoMarkerPosition != null) {
        runAsyncAction(
          state,
          {
            type: "map-query",
            z: state.core.mapPosition.target?.zoom ?? 7,
            ...state.core.infoMarkerPosition,
            map_id: null,
            columns: null,
          },
          dispatch
        );
      }
      // Apply all filters in parallel
      const filters = await Promise.all(
        state.core.filtersInfo.map((f) => {
          return runFilter(f);
        })
      );
      return { type: "initial-load-complete", filters };
    }
    case "map-layers-changed": {
      const { mapLayers } = action;
      if (mapLayers.has(MapLayer.COLUMNS) && state.core.allColumns == null) {
        const columns = await fetchAllColumns();
        return { type: "set-all-columns", columns };
      } else {
        return null;
      }
    }
    case "set-all-columns":
      if (state.core.infoMarkerPosition != null) {
        fetchColumnInfo(
          {
            lng: state.core.infoMarkerPosition.lng,
            lat: state.core.infoMarkerPosition.lat,
            columns: [],
          },
          action.columns,
          state.core.columnInfo,
          dispatch
        );
      }
      return action;
    case "toggle-menu": {
      // Push the menu onto the history stack
      let activePage = state.menu.activePage;
      // If input is focused we want to open the menu if clicked, not run the toggle action.
      if (activePage != null && !state.core.inputFocus) {
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
    case "go-to-experiments-panel": {
      await dispatch({ type: "toggle-experiments-panel", open: true });
      return await actionRunner(
        state,
        { type: "set-menu-page", page: MenuPage.SETTINGS },
        dispatch
      );
    }
    case "toggle-cross-section": {
      let line: LineString | null = null;
      if (state.core.crossSectionLine == null) {
        line = { type: "LineString", coordinates: [] };
      }
      const action: AppAction = {
        type: "update-cross-section",
        line,
      };
      return actionRunner(state, action, dispatch);
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
          state,
          { type: "async-add-filter", filter: result },
          dispatch
        );
      }
    case "async-add-filter":
      return { type: "add-filter", filter: await runFilter(action.filter) };
    case "get-filtered-columns":
      return await fetchFilteredColumns(coreState.filters);
    case "map-query":
      const { lng, lat, z, map_id } = action;
      // Get column data from the map action if it is provided.
      // This saves us from having to filter the columns more inefficiently
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

      // Run a bunch of async queries in ~parallel
      runMapQuery(lng, lat, z, map_id, sourceMapQuery.token).then((res) => {
        dispatch({ type: "received-map-query", data: res });
      });

      fetchColumnInfo(
        { lng, lat, columns: action.columns },
        state.core.allColumns,
        state.core.columnInfo,
        dispatch
      );
      return;
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
  state: AppState,
  action: AppAction,
  dispatch: any
) {
  const res = await actionRunner(state, action, dispatch);
  if (res != null) dispatch(res);
}

async function getColumnUnits(column: ColumnProperties, dispatch: any) {
  let CancelTokenGetColumn = axios.CancelToken;
  let sourceGetColumn = CancelTokenGetColumn.source();
  dispatch({ type: "start-column-query", cancelToken: sourceGetColumn });

  let columnData = await runColumnQuery(column, sourceGetColumn.token);
  dispatch({
    type: "received-column-query",
    data: columnData,
    column: column,
  });
}

type ColumnFetchParams = {
  lng: number;
  lat: number;
  columns: ColumnProperties[];
};

function fetchColumnInfo(
  params: ColumnFetchParams,
  allColumns: ColumnGeoJSONRecord[] | null,
  currentColumn: ColumnSummary | null,
  dispatch: any
): AppAction | void {
  const { lng, lat, columns } = params;
  let providedColumns = columns ?? [];

  if (providedColumns.length == 0) {
    // We could also just fire off a query using a lat/lon here
    providedColumns = findColumnsForLocation(allColumns ?? [], {
      lng,
      lat,
    }).map((c) => c.properties);
  }
  const nextColumn = providedColumns?.[0];
  if (nextColumn != null && currentColumn?.col_id != nextColumn.col_id) {
    // Get the column units if we don't have them already
    getColumnUnits(nextColumn, dispatch);
  } else if (nextColumn == null && currentColumn != null) {
    // Clear the column info if we don't have any columns
    dispatch({ type: "clear-column-info" });
  }
}
