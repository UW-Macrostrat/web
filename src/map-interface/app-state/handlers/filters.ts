import axios from "axios";
import { SETTINGS } from "../../Settings";

export const base = `${SETTINGS.apiDomain}/api/v2`;

export type AddFilter = { type: "add-filter"; filter: FilterData };

// handler to reduce noise on case & switch
// want this function to return an action object {type: "type", place/filter: fitler}
// this is still a mess
export async function runFilter(filter: Filter): Promise<AddFilter> {
  console.log("filter", filter);

  switch (filter.type) {
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
          legend_ids: [],
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
    // No working handler for environments yet...
    // case "environments":
    // case "environment_types":
    // case "environment_classes":
    //   return {
    //     type: "add-filter",
    //     filter: filter,
    //   };
  }
}

export enum FilterType {
  StratNameConcepts = "strat_name_concepts",
  StratNameOrphans = "strat_name_orphans",
  Intervals = "intervals",
  LithologyClasses = "lithology_classes",
  LithologyTypes = "lithology_types",
  Lithologies = "lithologies",
  AllLithologies = "all_lithologies",
  AllLithologyTypes = "all_lithology_types",
  AllLithologyClasses = "all_lithology_classes",
  Environments = "environments",
  EnvironmentTypes = "environment_types",
  EnvironmentClasses = "environment_classes",
}

type StratNameConceptsFilter = {
  type: FilterType.StratNameConcepts;
  id: number;
};

type StratNameFilterData = {
  category: "strat_name";
  type: FilterType.StratNameConcepts | FilterType.StratNameOrphans;
  id: number;
  name: string;
  legend_ids: number[];
};

//case "strat_name_concepts"
export const stratNameConcepts = async (
  filter: StratNameConceptsFilter
): Promise<StratNameFilterData> => {
  const { id } = filter;
  const conceptUrl = `${base}/defs/strat_name_concepts?concept_id=${id}`;
  const conceptIdRes = await axios.get(conceptUrl, { responseType: "json" });
  let f = conceptIdRes.data.success.data[0];

  const mobileUrl = `${base}/mobile/map_filter?concept_id=${id}`;
  const mobileRes = await axios.get(mobileUrl, { responseType: "json" });
  let legend_ids = mobileRes.data;

  return {
    category: "strat_name",
    id: id,
    type: FilterType.StratNameConcepts,
    name: f.name,
    legend_ids,
  };
};

type StratNameOrphansFilter = {
  type: FilterType.StratNameOrphans;
  id: number;
};

//strat_name_orphans
export const stratNameOrphans = async (
  filter: StratNameOrphansFilter
): Promise<StratNameFilterData> => {
  const { id } = filter;
  const params = { strat_name_id: id };
  const url = `${base}/defs/strat_names`;
  const res = await axios.get(url, { params, responseType: "json" });
  let f = res.data.success.data[0];

  const mobileURl = `${base}/mobile/map_filter`;
  const mobileRes = await axios.get(mobileURl, {
    params,
    responseType: "json",
  });
  const legend_ids = mobileRes.data;

  return {
    category: "strat_name",
    id,
    type: FilterType.StratNameOrphans,
    name: f.strat_name_long,
    legend_ids,
  };
};

type IntervalFilter = {
  type: FilterType.Intervals;
  id: number;
};

type IntervalFilterData = IntervalFilter & {
  name: string;
  category: "interval";
};

// intervals
export const fetchIntervalFilter = async (
  filter: IntervalFilter
): Promise<IntervalFilterData> => {
  const { id } = filter;

  let url = `${base}/defs/intervals?int_id=${id}`;
  const res = await axios.get(url, { responseType: "json" });
  let f = res.data.success.data[0];
  f.name = f.name;
  f.type = "intervals";
  f.category = "interval";
  f.id = id;
  return f;
};

type LithologyClassFilter = {
  type: FilterType.LithologyClasses;
  name: string;
};

type LithologyTypeFilter = {
  type: FilterType.LithologyTypes;
  name: string;
};

type LithologyFilter = {
  type: FilterType.Lithologies;
  id: number;
};

// Environment filters are unused for now
type EnvironmentFilter = {
  type: FilterType.Environments;
  id: number;
};

type EnvironmentTypeFilter = {
  type: FilterType.EnvironmentTypes;
  name: string;
};

type EnvironmentClassFilter = {
  type: FilterType.EnvironmentClasses;
  name: string;
};

type LithologyFilterData = {
  category: "lithology";
  type:
    | FilterType.Lithologies
    | FilterType.LithologyClasses
    | FilterType.LithologyTypes
    | FilterType.AllLithologies
    | FilterType.AllLithologyClasses
    | FilterType.AllLithologyTypes;
  id: number;
  name: string;
  legend_ids: number[];
};

//case "lithologies":
async function fetchLithFilter(
  filter: LithologyFilter
): Promise<LithologyFilterData> {
  const { id } = filter;
  let url = `${base}/defs/lithologies?lith_id=${id}`;
  const res = await axios.get(url, { responseType: "json" });
  const f = res.data.success.data[0];

  let mobileURl = `${base}/mobile/map_filter?lith_id=${id}`;
  const mobileRes = await axios.get(mobileURl, { responseType: "json" });
  let legend_ids = mobileRes.data;

  return {
    category: "lithology",
    id,
    type: FilterType.Lithologies,
    name: f.name,
    legend_ids,
  };
}

type AllLithologiesFilter = {
  type: FilterType.AllLithologies;
  id: number;
};

//case "all_lithologies":
async function fetchAllLithsFilter(
  filter: AllLithologiesFilter
): Promise<LithologyFilterData> {
  const { id } = filter;
  let url = `${base}/defs/lithologies?lith_id=${id}`;
  let res = await axios.get(url, { responseType: "json" });
  let f = res.data.success.data[0];

  let mobileURL = `${base}/mobile/map_filter?all_lith_id=${id}`;
  let mobileRes = await axios.get(mobileURL, { responseType: "json" });
  let legend_ids = mobileRes.data;

  return {
    category: "lithology",
    id,
    type: FilterType.AllLithologies,
    name: f.name,
    legend_ids,
  };
}

type AllLithologyTypesFilter = {
  type: FilterType.AllLithologyTypes;
  id: number;
  //name?: string;
};

type AllLithologyClassesFilter = {
  type: FilterType.AllLithologyClasses;
  id: number;
};

// case "all_lithology_classes":
//  case "all_lithology_types":
async function fetchAllLithTypes(
  filter: AllLithologyClassesFilter | AllLithologyTypesFilter
): Promise<LithologyFilterData> {
  const { type, name, id } = filter;
  let param =
    type === "all_lithology_classes" ? "all_lith_class" : "all_lith_type";
  let url = `${base}/mobile/map_filter?${param}=${id || name}`;
  const res = await axios.get(url, { responseType: "json" });
  const legend_ids = res.data;
  return {
    category: "lithology",
    id: 0,
    name,
    type,
    legend_ids,
  };
}

export type Filter =
  | StratNameConceptsFilter
  | StratNameOrphansFilter
  | IntervalFilter
  | LithologyClassFilter
  | LithologyTypeFilter
  | LithologyFilter
  | AllLithologiesFilter
  | AllLithologyTypesFilter
  | AllLithologyClassesFilter
  | EnvironmentFilter
  | EnvironmentTypeFilter
  | EnvironmentClassFilter;

export type FilterData =
  | LithologyFilterData
  | IntervalFilterData
  | StratNameFilterData;
