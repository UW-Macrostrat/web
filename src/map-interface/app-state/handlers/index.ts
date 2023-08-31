import {
  fetchFilteredColumns,
  handleXDDQuery,
  runColumnQuery,
  runMapQuery,
  getPBDBData,
  base,
  fetchAllColumns,
} from "./fetch";
import { AppAction, AppState } from "../reducers";
import axios from "axios";
import { runFilter } from "./filters";
import { push } from "@lagunovsky/redux-react-router";
import { routerBasename } from "~/map-interface/settings";

import { isDetailPanelRoute } from "../nav-hooks";
import { MenuPage, setInfoMarkerPosition } from "../reducers";
import { formatCoordForZoomLevel } from "~/map-interface/utils/formatting";
import { currentPageForPathName } from "../nav-hooks";
import { getInitialStateFromHash } from "../reducers/hash-string";
import { findColumnForLocation, ColumnGeoJSONRecord } from "./columns";
import { MapLayer } from "../reducers/core";
import { matchPath } from "react-router";
import { LineString } from "geojson";

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

      // If we are on the column route, the column layer must be enabled
      const colMatch = matchPath("/loc/:lng/:lat/column", pathname);
      if (colMatch != null) {
        coreState1.mapLayers.add(MapLayer.COLUMNS);
      }

      // Fill out the remainder with defaults

      // We always get all columns on initial load, which might be
      // a bit unnecessary
      let columns: ColumnGeoJSONRecord[] | null = null;
      if (coreState1.mapLayers.has(MapLayer.COLUMNS)) {
        columns = await fetchAllColumns();
      }

      dispatch({
        type: "replace-state",
        state: {
          ...state,
          core: {
            ...coreState1,
            allColumns: columns,
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
      await dispatch({ type: "set-filters", filters: newFilters });

      // Then reload the map by faking a layer change event.
      // There is probably a better way to do this.
      return {
        type: "map-layers-changed",
        mapLayers: coreState1.mapLayers,
      };
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
    case "set-menu-page": {
      const { pathname, hash } = state.router.location;
      if (!isDetailPanelRoute(pathname)) {
        const newPathname = routerBasename + (action.page ?? "");
        await dispatch(push({ pathname: newPathname, hash }));
      }
      return { type: "set-menu-page", page: action.page };
    }
    case "close-infodrawer":
      // If we are showing a cross-section, we need to go there
      let nextPathname = "";
      if (state.core.crossSectionLine != null) {
        nextPathname = buildCrossSectionPath(state.core.crossSectionLine);
      } else {
        nextPathname = state.menu.activePage ?? "";
      }
      await dispatch(
        push({
          pathname: routerBasename + nextPathname,
          hash: state.router.location.hash,
        })
      );
      return action;
    case "toggle-cross-section": {
      let line: GeoJSON.LineString | null = null;
      if (state.core.crossSectionLine == null) {
        line = { type: "LineString", coordinates: [] };
      }
      const action = {
        type: "update-cross-section",
        line,
      };
      return actionRunner(state, action, dispatch);
    }
    case "update-cross-section":
      if (state.core.crossSectionLine != null) {
        // Return to the base route
        let nextPathname = "";
        const pos = state.core.infoMarkerPosition;
        if (pos != null) {
          const z = state.core.mapPosition.target?.zoom ?? 7;
          nextPathname = buildLocationPath(pos.lng, pos.lat, z);
        } else {
          nextPathname = state.menu.activePage ?? "";
        }
        await dispatch(
          push({
            pathname: routerBasename + nextPathname,
            hash: state.router.location.hash,
          })
        );
      }
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
    case "fetch-xdd":
      const { mapInfo } = coreState;
      let CancelToken1 = axios.CancelToken;
      let source1 = CancelToken1.source();
      dispatch({
        type: "start-xdd-query",
        cancelToken: source1,
      });
      const gdd_data = await handleXDDQuery(mapInfo, source1.token);
      return { type: "received-xdd-query", data: gdd_data };
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
      return {
        type: "update-column-filters",
        columns: await fetchFilteredColumns(coreState.filters),
      };
    case "set-cross-section-line": {
      const { line } = action;

      if (state.core.infoMarkerPosition == null) {
        // If we are showing a marker, that route takes precedence
        const pathname = routerBasename + buildCrossSectionPath(line);
        await dispatch(push({ pathname, hash: location.hash }));
      }

      return { type: "did-set-cross-section-line", line };
    }
    case "map-query": {
      const { lng, lat, z } = action;
      // Check if matches column detail route
      const { pathname } = state.router.location;

      let newPath = routerBasename + buildLocationPath(lng, lat, Number(z));
      if (pathname.startsWith("/loc") && pathname.endsWith("/column")) {
        // If so, we want to append columns to the end of the URL
        newPath += "/column";
      }

      return push({
        pathname: newPath,
        hash: location.hash,
      });
      //return { ...action, type: "run-map-query" };
    }
    case "run-map-query":
      const { lng, lat, z, map_id } = action;
      // Get column data from the map action if it is provided.
      // This saves us from having to filter the columns more inefficiently
      let { columns } = action;
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
      let mapData = await runMapQuery(
        lng,
        lat,
        z,
        map_id,
        sourceMapQuery.token
      );

      if (
        columns == null &&
        state.core.allColumns != null &&
        state.core.mapLayers.has(MapLayer.COLUMNS)
      ) {
        let col = findColumnForLocation(state.core.allColumns, {
          lng,
          lat,
        })?.properties;
        if (col != null) {
          columns = [col];
        }
      }

      const firstColumn = columns?.[0];
      const { columnInfo } = state.core;
      if (firstColumn != null && columnInfo?.col_id != firstColumn.col_id) {
        // Get the column units if we don't have them already
        actionRunner(
          state,
          { type: "get-column-units", column: firstColumn },
          dispatch
        ).then(dispatch);
      } else if (firstColumn == null && columnInfo != null) {
        // Clear the column info if we don't have any columns
        dispatch({ type: "clear-column-info", data: null, column: null });
      }

      coreState.infoMarkerPosition = { lng, lat };
      return {
        type: "received-map-query",
        data: mapData,
      };
    case "get-column-units":
      let CancelTokenGetColumn = axios.CancelToken;
      let sourceGetColumn = CancelTokenGetColumn.source();
      dispatch({ type: "start-column-query", cancelToken: sourceGetColumn });

      let columnData = await runColumnQuery(
        action.column,
        sourceGetColumn.token
      );
      return {
        type: "received-column-query",
        data: columnData,
        column: action.column,
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

function buildCrossSectionPath(line: LineString) {
  const pts = line.coordinates
    .map((p) => `${p[0].toFixed(4)},${p[1].toFixed(4)}`)
    .join("/");

  return "cross-section/" + pts;
}

function buildLocationPath(lng: number, lat: number, z: number) {
  const ln = formatCoordForZoomLevel(lng, Number(z));
  const lt = formatCoordForZoomLevel(lat, Number(z));
  return `loc/${ln}/${lt}`;
}

export default actionRunner;
