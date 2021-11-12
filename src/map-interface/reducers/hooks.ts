import {
  Action,
  doSearchAsync,
  fetchAllLithsFilter,
  fetchAllLithTypes,
  fetchFilteredColumns,
  fetchIntervalFilter,
  fetchLithFilter,
  stratNameConcepts,
  stratNameOrphans,
  useActionDispatch,
} from "../actions";
import update from "./legacy";
import { useSelector } from "react-redux";
import axios from "axios";

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
    case "async-add-filter": //this is mess
      let filter = action.filter;
      switch (filter.type) {
        case "place":
          return runAction(state, { type: "go-to-place", place: filter });
        case "strat_name_concepts":
          let f = await stratNameConcepts(filter);
          return runAction(state, { type: "add-filter", filter: f });
        case "strat_name_orphans":
          let sNOFilter = await stratNameOrphans(filter);
          return runAction(state, { type: "add-filter", filter: sNOFilter });
        case "intervals":
          let intervalFilter = await fetchIntervalFilter(filter);
          return runAction(state, {
            type: "add-filter",
            filter: intervalFilter,
          });
        case "lithology_classes":
        case "lithology_types":
          // for some reason when loading from the uri this tiny timeout is required
          setTimeout(() => {
            return runAction(state, {
              type: "add-filter",
              filter: {
                category: "lithology",
                id: 0,
                name: filter.name,
                type: filter.type,
              },
            });
          }, 1);
          break;
        case "lithologies":
          let lithfilter = await fetchLithFilter(filter);
          return runAction(state, { type: "add-filter", filter: lithfilter });
        case "all_lithologies":
          let allLithsFilter = await fetchAllLithsFilter(filter);
          return runAction(state, {
            type: "add-filter",
            filter: allLithsFilter,
          });
        case "all_lithology_classes":
        case "all_lithology_types":
          let allLithsTypesFilter = await fetchAllLithTypes(filter);
          return runAction(state, {
            type: "add-filter",
            filter: allLithsTypesFilter,
          });
        case "environments":
        case "environment_types":
        case "environment_classes":
          return runAction(state, {
            type: "add-filter",
            filter: filter,
          });
      }
      if (state.mapHasColumns) {
        return runAction(state, { type: "get-filtered-columns", filter });
      }
    case "get-filtered-columns":
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
      console.log(state, action);
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
