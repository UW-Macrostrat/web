import {
  fetchAllLithsFilter,
  fetchAllLithTypes,
  fetchIntervalFilter,
  fetchLithFilter,
  stratNameConcepts,
  stratNameOrphans,
} from "./fetch";
import { Action } from "../reducers";

// handler to reduce noise on case & switch
// want this function to return an action object {type: "type", place/filter: fitler}
// this is still a mess
const asyncFilterHandler = async (filter): Promise<Action> => {
  switch (filter.type) {
    case "place":
      return { type: "go-to-place", place: filter };
    case "strat_name_concepts":
      let f = await stratNameConcepts(filter);
      return { type: "add-filter", filter: f };
    case "strat_name_orphans":
      let sNOFilter = await stratNameOrphans(filter);
      return { type: "add-filter", filter: sNOFilter };
    case "intervals":
      let intervalFilter = await fetchIntervalFilter(filter);
      return {
        type: "add-filter",
        filter: intervalFilter,
      };
    case "lithology_classes":
    case "lithology_types":
      // for some reason when loading from the uri this tiny timeout is required
      return {
        type: "add-filter",
        filter: {
          category: "lithology",
          id: 0,
          name: filter.name,
          type: filter.type,
        },
      };
    case "lithologies":
      let lithfilter = await fetchLithFilter(filter);
      return { type: "add-filter", filter: lithfilter };
    case "all_lithologies":
      let allLithsFilter = await fetchAllLithsFilter(filter);
      return {
        type: "add-filter",
        filter: allLithsFilter,
      };
    case "all_lithology_classes":
    case "all_lithology_types":
      let allLithsTypesFilter = await fetchAllLithTypes(filter);
      return {
        type: "add-filter",
        filter: allLithsTypesFilter,
      };
    case "environments":
    case "environment_types":
    case "environment_classes":
      return {
        type: "add-filter",
        filter: filter,
      };
  }
};

export { asyncFilterHandler };
