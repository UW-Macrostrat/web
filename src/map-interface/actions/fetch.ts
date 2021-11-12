import axios from "axios";
import { SETTINGS } from "../Settings";

let base = `${SETTINGS.apiDomain}/api/v2`;

export const doSearchAsync = async (term, cancelToken) => {
  let url = `${base}/mobile/autocomplete?include=interval,lithology,environ,strat_name&query=${term}`;

  const res = await axios.get(url, {
    cancelToken,
    responseType: "json",
  });
  return res.data.success.data;
};

//case "strat_name_concepts"
export const stratNameConcepts = async (filter) => {
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
    type: "strat_name_concepts",
    name: f.name,
    legend_ids,
  };
};

//strat_name_orphans
export const stratNameOrphans = async (filter) => {
  const { id } = filter;
  const url = `${base}/defs/strat_names?strat_name_id=${id}`;
  const res = await axios.get(url, { responseType: "json" });
  let f = res.data.success.data[0];

  const mobileURl = `${base}/mobile/map_filter?strat_name_id=${id}`;
  const mobileRes = await axios.get(mobileURl, { responseType: "json" });
  const legend_ids = mobileRes.data;

  return {
    category: "strat_name",
    id,
    type: "strat_name_orphans",
    name: f.strat_name_long,
    legend_ids,
  };
};

// intervals
export const fetchIntervalFilter = async (filter) => {
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

//case "lithologies":
export const fetchLithFilter = async (filter) => {
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
    type: "lithologies",
    name: f.name,
    legend_ids,
  };
};

//case "all_lithologies":
export const fetchAllLithsFilter = async (filter) => {
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
    type: "all_lithologies",
    name: f.name,
    legend_ids,
  };
};

// case "all_lithology_classes":
//  case "all_lithology_types":
export const fetchAllLithTypes = async (filter) => {
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
  console.log("FILTERS", filters);
  let possibleFields = [
    { key: "intervals", value: "int_id", attr: "id" },
    { key: "strat_name_concepts", value: "strat_name_concept_id", attr: "id" },
    { key: "strat_name_orphans", value: "strat_name_id", attr: "id" },
    { key: "lithology_classes", value: "lith_class", attr: "name" },
    { key: "lithology_types", value: "lith_type", attr: "name" },
    { key: "lithologies", value: "lith_id", attr: "id" },
    { key: "environment", value: "environ_id", attr: "id" },
    { key: "environment_types", value: "environ_type", attr: "name" },
    { key: "environment_classes", value: "environ_class", attr: "name" },
  ];
  let query = {};
  filters.forEach((f) => {
    possibleFields.map((field) => {
      if (f.type === field.key) {
        if (query[field.value]) {
          query[field.value].push(f[field.attr]);
        } else {
          query[field.value] = [f[field.attr]];
        }
      }
    });
  });
  console.log("FILTERED COLUMN QUERY", query);
  let queryString = Object.keys(query)
    .map((k) => {
      console.log("QUERY KEY", k, typeof k);
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
