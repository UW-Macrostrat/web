import {
  fetchAllLithsFilter,
  fetchAllLithTypes,
  fetchIntervalFilter,
  fetchLithFilter,
  stratNameConcepts,
  stratNameOrphans,
} from "./fetch";
import { Action } from "../reducers";

type StratNameConceptsFilter = {
  type: "strat_name_concepts";
  id: number;
};

type StratNameOrphansFilter = {
  type: "strat_name_orphans";
  id: number;
};

type IntervalFilter = {
  type: "intervals";
  id: number;
};

type LithologyClassFilter = {
  type: "lithology_classes";
  name: string;
};

type LithologyTypeFilter = {
  type: "lithology_types";
  name: string;
};

type LithologyFilter = {
  type: "lithologies";
  id: number;
};

type AllLithologyFilter = {
  type: "all_lithologies";
};

type AllLithologyTypeFilter = {
  type: "all_lithology_types";
};

type AllLithologyClassFilter = {
  type: "all_lithology_classes";
};

type EnvironmentFilter = {
  type: "environments";
  id: number;
};

type EnvironmentTypeFilter = {
  type: "environment_types";
  name: string;
};

type EnvironmentClassFilter = {
  type: "environment_classes";
  name: string;
};

type Filter =
  | StratNameConceptsFilter
  | StratNameOrphansFilter
  | IntervalFilter
  | LithologyClassFilter
  | LithologyTypeFilter
  | LithologyFilter
  | AllLithologyFilter
  | AllLithologyTypeFilter
  | AllLithologyClassFilter
  | EnvironmentFilter
  | EnvironmentTypeFilter
  | EnvironmentClassFilter;

// handler to reduce noise on case & switch
// want this function to return an action object {type: "type", place/filter: fitler}
// this is still a mess
const asyncFilterHandler = async (filter: Filter): Promise<Action> => {
  console.log("filter", filter);

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
