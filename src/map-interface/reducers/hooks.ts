import {
  Action,
  doSearchAsync,
  fetchFilteredColumns,
  useActionDispatch,
  getAsyncGdd,
  asyncGetColumn,
  asyncQueryMap,
  asyncGetElevation,
  asyncGetPBDBCollection,
  asyncGetPBDBOccurences,
  mergePBDBResponses,
} from "../actions";
import { useSelector } from "react-redux";
import axios from "axios";
import { asyncFilterHandler } from "./filters";

function getCancelToken() {
  let CancelToken = axios.CancelToken;
  let source = CancelToken.source();
  return source;
}

async function runAction(
  state,
  action: Action,
  dispatch = null
): Promise<Action> {
  switch (action.type) {
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
      dispatch({
        type: "start-map-query",
        lng,
        lat,
        cancelToken: sourceMapQuery,
      });
      // if (column) {
      //   runAction(state, { type: "get-column" });
      // }
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
      const sourceCollection = getCancelToken();
      const sourceOccur = getCancelToken();
      dispatch({ type: "start-pdbd-query", cancelToken: sourceCollection });
      const collection = await asyncGetPBDBCollection(
        collection_nos,
        sourceCollection.token
      );
      dispatch({ type: "update-pbdb-query", cancelToken: sourceOccur });
      const occurences = await asyncGetPBDBOccurences(
        collection_nos,
        sourceOccur.token
      );
      const collections = mergePBDBResponses(occurences, collection);
      return {
        type: "received-pbdb-query",
        data: collections,
      };
    default:
      return action;
  }
}
function useAppActions() {
  const dispatch = useActionDispatch();
  const state = useLegacyState();
  return async (action) => {
    const newAction: Action = await runAction(state, action, dispatch);
    dispatch(newAction);
  };
}

function useFilterState() {
  const { filters, filtersOpen } = useSelector((state) => state.update);
  return { filters, filtersOpen };
}

function useSearchState() {
  const { searchResults, isSearching, term, inputFocus } = useSelector(
    (state) => state.update
  );
  return { searchResults, isSearching, term, inputFocus };
}

function useMenuState() {
  const menuOpen = useSelector((state) => state.update.menuOpen);
  const menu = useSelector((state) => state.menu);
  return { menuOpen, ...menu };
}

function useMapHasBools() {
  const {
    mapHasBedrock,
    mapHasSatellite,
    mapHasColumns,
    mapHasFossils,
    mapHasLines,
  } = useSelector((state) => state.update);
  return {
    mapHasBedrock,
    mapHasSatellite,
    mapHasColumns,
    mapHasFossils,
    mapHasLines,
  };
}

function useLegacyState() {
  const legacyState = useSelector((state) => state.update);
  return legacyState;
}

export {
  useAppActions,
  useFilterState,
  useLegacyState,
  useSearchState,
  useMenuState,
  useMapHasBools,
};
