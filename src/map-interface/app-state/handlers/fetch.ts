import axios from "axios";
import { SETTINGS } from "../../Settings";

export const base = `${SETTINGS.apiDomain}/api/v2`;
const basev1 = `${SETTINGS.gddDomain}/api/v1`;
const pbdbURL = `${SETTINGS.pbdbDomain}/data1.2/colls/list.json`;
const pbdbURLOccs = `${SETTINGS.pbdbDomain}/data1.2/occs/list.json`;

enum FilterType {
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

type StratNameData = {
  category: "strat_name";
  type: FilterType.StratNameConcepts | FilterType.StratNameOrphans;
  id: number;
  name: string;
  legend_ids: number[];
};

//case "strat_name_concepts"
export const stratNameConcepts = async (
  filter: StratNameConceptsFilter
): Promise<StratNameData> => {
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
): Promise<StratNameData> => {
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
    | FilterType.LithologyClasses
    | FilterType.LithologyTypes
    | FilterType.AllLithologies;
  id: number;
  name: string;
  legend_ids: number[];
};

//case "lithologies":
export const fetchLithFilter = async (
  filter: LithologyFilter
): Promise<LithologyFilterData> => {
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
};

type AllLithologiesFilter = {
  type: FilterType.AllLithologies;
  id: number;
};

//case "all_lithologies":
export const fetchAllLithsFilter = async (
  filter: AllLithologiesFilter
): Promise<LithologyFilterData> => {
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
};

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
export const fetchAllLithTypes = async (
  filter: AllLithologyClassesFilter | AllLithologyTypesFilter
): Promise<LithologyFilterData> => {
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
};

function formColumnQueryString(filters) {
  let possibleFields = {
    intervals: ["int_id", "id"], // [value, attr]
    strat_name_concepts: ["strat_name_concept_id", "id"],
    strat_name_orphans: ["strat_name_id", "id"],
    lithology_classes: ["lith_class", "name"],
    lithology_types: ["lith_type", "name"],
    lithologies: ["lith_id", "id"],
    environment: ["environ_id", "id"],
    environment_types: ["environ_type", "name"],
    environment_classes: ["environ_class", "name"],
  };

  let query = {};
  filters.forEach((f) => {
    let [value, attr] = possibleFields[f.type];
    if (query[value]) {
      query[value].push(f[attr]);
    } else {
      query[value] = [f[attr]];
    }
  });
  let queryString = Object.keys(query)
    .map((k) => {
      return `${k}=${query[k].join(",")}`;
    })
    .join("&");

  return queryString;
}

export async function fetchFilteredColumns(providedFilters) {
  let queryString = formColumnQueryString(providedFilters);
  let url = `${base}/columns?format=geojson_bare&${queryString}`;
  let res = await axios.get(url, { responseType: "json" });
  return res.data;
}

export async function getAsyncGdd(mapInfo, cancelToken) {
  if (
    !mapInfo ||
    !mapInfo.mapData.length ||
    Object.keys(mapInfo.mapData[0].macrostrat).length === 0
  ) {
    return [];
  }
  let stratNames = mapInfo.mapData[0].macrostrat.strat_names
    .map((d) => {
      return d.rank_name;
    })
    .join(",");

  let url = `${basev1}/excerpts?term=${stratNames}`;

  const res = await axios.get(url, {
    cancelToken: cancelToken,
    responseType: "json",
  });
  try {
    let data = res.data.success.data;
    return data;
  } catch (error) {
    return [];
  }
}

function addMapIdToRef(data) {
  data.success.data.mapData = data.success.data.mapData.map((source) => {
    source.ref.map_id = source.map_id;
    return source;
  });
  return data;
}

export const asyncQueryMap = async (lng, lat, z, map_id, cancelToken) => {
  let url = `${base}/mobile/map_query_v2?lng=${lng.toFixed(
    5
  )}&lat=${lat.toFixed(5)}&z=${parseInt(z)}`;
  if (map_id) {
    url += `map_id=${map_id}`;
  }
  let res = await axios.get(url, { cancelToken, responseType: "json" });
  const data = addMapIdToRef(res.data).success.data;
  return data;
};

export const asyncGetColumn = async (column, cancelToken) => {
  let url = `${base}/units?response=long&col_id=${column.col_id}`;
  const res = await axios.get(url, { cancelToken, responseType: "json" });
  try {
    return res.data.success.data;
  } catch (error) {
    return [];
  }
};

export const asyncGetElevation = async (line, cancelToken) => {
  const [start_lng, start_lat] = line[0];
  const [end_lng, end_lat] = line[1];

  let params = { start_lng, start_lat, end_lng, end_lat };

  let url = `${base}/elevation`;

  const res = await axios.get(url, {
    //cancelToken,
    responseType: "json",
    params: params,
  });
  const data = res.data;
  try {
    return data.success.data;
  } catch (error) {
    return [];
  }
};

/* PBDB data */
// use new cancellation API

let abortController = null;

export async function getPBDBData(collections: number[]) {
  abortController?.abort();
  abortController = new AbortController();
  const coll_id = collections.join(",");
  const opts: any = {
    responseType: "json",
    signal: abortController.signal,
  };

  return Promise.all([
    axios.get(pbdbURL, {
      ...opts,
      params: {
        id: coll_id,
        show: "ref,time,strat,geo,lith,entname,prot",
        markrefs: true,
      },
    }),
    axios.get(pbdbURLOccs, {
      ...opts,
      params: { coll_id, show: "phylo,ident" },
    }),
  ])
    .then(([collections, occurences]) => {
      return mergePBDBResponses(collections, occurences);
    })
    .finally(() => {
      abortController = null;
    });
}

function mergePBDBResponses(collectionResponse, occurrenceResponse) {
  try {
    const occurrences = occurrenceResponse.data.records;
    return collectionResponse.data.records.map((col) => {
      col.occurrences = [];
      occurrences.forEach((occ) => {
        if (occ.cid === col.oid) {
          col.occurrences.push(occ);
        }
      });
      return col;
    });
  } catch (error) {
    console.log(error);
    return [];
  }
}

export type Filter =
  | StratNameConceptsFilter
  | StratNameOrphansFilter
  | IntervalFilter
  | LithologyClassFilter
  | LithologyTypeFilter
  | LithologyFilter
  | AllLithologyFilter
  | AllLithologyTypesFilter
  | AllLithologyClassesFilter
  | EnvironmentFilter
  | EnvironmentTypeFilter
  | EnvironmentClassFilter;
