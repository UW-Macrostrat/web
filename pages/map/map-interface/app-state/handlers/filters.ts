import { apiV2Prefix } from "@macrostrat-web/settings";
import axios from "axios";

export const base = apiV2Prefix;

export type AddFilter = { type: "add-filter"; filter: FilterData };

// handler to reduce noise on case & switch
// want this function to return an action object {type: "type", place/filter: fitler}
// this is still a mess
/** Resolve a search result or URL-hash filter into the data the map and column
 * layers need. Returns `null` for a filter type we can't handle, so callers can
 * drop it instead of pushing `undefined` into the filter list. */
export async function runFilter(filter: Filter): Promise<FilterData | null> {
  switch (filter.type) {
    case "strat_name_concepts":
      return await stratNameConcepts(filter);
    case "strat_name_orphans":
      return await stratNameOrphans(filter);
    case "intervals":
      return await fetchIntervalFilter(filter);
    case "lithology_classes":
    case "lithology_types":
      // for some reason when loading from the uri this tiny timeout is required
      return {
        category: "lithology",
        id: filter.name ?? filter.id,
        name: filter.name ?? filter.id.toString(),
        type: filter.type,
        legend_ids: [],
      };
    case "lithologies":
      return await fetchLithFilter(filter);
    case "all_lithologies":
      return await fetchAllLithsFilter(filter);
    case "all_lithology_classes":
    case "all_lithology_types":
      return await fetchAllLithTypes(filter);
    case "environments":
      return await fetchEnvironmentFilter(filter);
    case "environment_types":
    case "environment_classes":
      // Like lithology classes and types, these are keyed by name: the
      // autocomplete table gives them `id = 0`.
      return {
        category: "environment",
        id: filter.name ?? filter.id,
        name: filter.name ?? filter.id.toString(),
        type: filter.type,
      };
    default:
      return null;
  }
}

/** Filter types whose identifier is a *name* (a lithology or environment class
 * or type), not a numeric ID. */
export function isNameKeyedFilterType(type: FilterType): boolean {
  return [
    FilterType.LithologyClasses,
    FilterType.LithologyTypes,
    FilterType.AllLithologyClasses,
    FilterType.AllLithologyTypes,
    FilterType.EnvironmentTypes,
    FilterType.EnvironmentClasses,
  ].includes(type);
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

export type StratNameFilterData = {
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

type Timescale = {
  timescale_id: number;
  name: string;
};

export type IntervalFilterData = IntervalFilter & {
  category: "interval";
  // These are standard fields for all intervals returned from Macrostrat's API
  int_id: number;
  name: string;
  abbrev: string;
  t_age: number;
  b_age: number;
  int_type: string;
  timescales: Timescale[];
  color: string;
};

// intervals
export const fetchIntervalFilter = async (
  filter: IntervalFilter
): Promise<IntervalFilterData> => {
  const { id } = filter;

  let url = `${base}/defs/intervals?int_id=${id}`;
  const res = await axios.get(url, { responseType: "json" });
  let f = res.data.success.data[0];
  return {
    ...f,
    type: FilterType.Intervals,
    category: "interval",
    id,
  };
};

/* Lithology classes and lithology types are filtered by name */

type LithologyClassFilter = {
  type: FilterType.LithologyClasses;
  name: string;
  id: number;
};

type LithologyTypeFilter = {
  type: FilterType.LithologyTypes;
  name: string;
  id: number;
};

type LithologyFilter = {
  type: FilterType.Lithologies;
  id: number;
};

/* Environments are attributes of column units, not of map legend entries, so an
 * environment filter narrows the *columns* layer only; the map polygons are left
 * alone (see `getExpressionForFilters`). Types and classes are keyed by name. */
type EnvironmentFilter = {
  type: FilterType.Environments;
  id: number;
};

type EnvironmentTypeFilter = {
  type: FilterType.EnvironmentTypes;
  name?: string;
  id: string;
};

type EnvironmentClassFilter = {
  type: FilterType.EnvironmentClasses;
  name?: string;
  id: string;
};

export type EnvironmentFilterData = {
  category: "environment";
  type:
    | FilterType.Environments
    | FilterType.EnvironmentTypes
    | FilterType.EnvironmentClasses;
  name: string;
  id: string | number;
  /** Set for a specific environment; classes and types have no color. */
  color?: string;
  environ_id?: number;
};

//case "environments":
async function fetchEnvironmentFilter(
  filter: EnvironmentFilter
): Promise<EnvironmentFilterData> {
  const { id } = filter;
  const url = `${base}/defs/environments?environ_id=${id}`;
  const res = await axios.get(url, { responseType: "json" });
  const f = res.data.success.data[0];

  return {
    category: "environment",
    id,
    environ_id: id,
    type: FilterType.Environments,
    name: f.name,
    color: f.color,
  };
}

type LithologyFilterData = {
  category: "lithology";
  type:
    | FilterType.Lithologies
    | FilterType.LithologyClasses
    | FilterType.LithologyTypes
    | FilterType.AllLithologies
    | FilterType.AllLithologyClasses
    | FilterType.AllLithologyTypes;
  name: string;
  id: string | number;
  legend_ids: number[];
  /** Set for a specific lithology; classes and types have no single color. */
  color?: string;
  lith_id?: number;
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
    lith_id: id,
    type: FilterType.Lithologies,
    name: f.name,
    color: f.color,
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
    lith_id: id,
    type: FilterType.AllLithologies,
    name: f.name,
    color: f.color,
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
  const { type, id } = filter;
  let param =
    type === "all_lithology_classes" ? "all_lith_class" : "all_lith_type";
  let url = `${base}/mobile/map_filter?${param}=${id}`;
  const res = await axios.get(url, { responseType: "json" });
  const legend_ids = res.data;
  return {
    category: "lithology",
    id,
    // TODO: revisit name/id differences
    name: id.toString(),
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
  | StratNameFilterData
  | EnvironmentFilterData;

export type FilterCategory = FilterData["category"];

/** Whether a filter narrows the map polygons. Environment filters don't: the
 * map legend carries no environment information, so they act on columns only. */
export function filterAppliesToMap(filter: FilterData): boolean {
  return filter.category !== "environment";
}
