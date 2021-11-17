import {
  Action,
  doSearchAsync,
  fetchFilteredColumns,
  useActionDispatch,
  getAsyncGdd,
} from "../actions";
import update from "./legacy";
import { useSelector } from "react-redux";
import axios from "axios";
import { asyncFilterHandler } from "./filters";

async function runAction(state, action: Action, dispatch = null) {
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
      return runAction(state, { type: "received-search-query", data });
    case "fetch-gdd":
      const { mapInfo } = state;
      let CancelToken1 = axios.CancelToken;
      let source1 = CancelToken1.source();
      dispatch({
        type: "start-gdd-query",
        cancelToken: source1,
      });
      const gdd_data = await getAsyncGdd(mapInfo, source1.token);
      return runAction(state, { type: "received-gdd-query", data: gdd_data });
    case "async-add-filter":
      let filter = action.filter;
      const filterAction = await asyncFilterHandler(filter);
      return runAction(state, filterAction);
    case "get-filtered-columns":
      if (!state.mapHasColumns) {
        break;
      }
      let filters_ = state.filters;
      if (!action.filter) {
        filters_ = [...filters_, action.filter];
      }
      let filteredColumns = await fetchFilteredColumns(filters_);
      return runAction(state, {
        type: "update-column-filters",
        columns: filteredColumns,
      });
    default:
      return update(state, action);
  }
}
function useAppActions() {
  const dispatch = useActionDispatch();
  const state = useLegacyState();
  return async (action) => {
    let newState = await runAction(state, action, dispatch);
    dispatch({ type: "update-state", state: newState });
  };
}

function useFilterState() {
  const { filters, filtersOpen } = useSelector((state) => state.update);
  return { filters, filtersOpen };
}

function useSearchState() {
  const { searchResults, isSearching } = useSelector((state) => state.update);
  return { searchResults, isSearching };
}

function useMenuState() {
  const { menuOpen } = useSelector((state) => state.update);
  return { menuOpen };
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
