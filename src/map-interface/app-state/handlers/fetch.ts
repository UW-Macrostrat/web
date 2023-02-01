import axios from "axios";
import { SETTINGS } from "../../Settings";

export const base = `${SETTINGS.apiDomain}/api/v2`;
const basev1 = `${SETTINGS.gddDomain}/api/v1`;
const pbdbURL = `${SETTINGS.pbdbDomain}/data1.2/colls/list.json`;
const pbdbURLOccs = `${SETTINGS.pbdbDomain}/data1.2/occs/list.json`;

import { FilterType } from "./filters";

type PossibleFields = {
  [Property in FilterType]: string[];
};

function formColumnQueryString(filters) {
  let possibleFields: PossibleFields = {
    intervals: ["int_id", "id"], // [value, attr]
    strat_name_concepts: ["strat_name_concept_id", "id"],
    strat_name_orphans: ["strat_name_id", "id"],
    lithology_classes: ["lith_class", "name"],
    lithology_types: ["lith_type", "name"],
    lithologies: ["lith_id", "id"],
    // These cases weren't handled in v3, hopefully adding
    // them here does not cause new problems...
    all_lithology_classes: ["lith_class", "name"],
    all_lithology_types: ["lith_type", "name"],
    all_lithologies: ["lith_id", "id"],
    // Environments are unused for now in map filtering, but used in
    // column filtering (I think)
    environments: ["environ_id", "id"],
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

export interface XDDSnippet {
  pubname: string;
  publisher: string;
  _gddid: string;
  title: string;
  doi: string;
  coverDate: string;
  URL: string;
  authors: string;
  hits: number;
  highlight: string[];
}

export async function handleXDDQuery(
  mapInfo,
  cancelToken
): Promise<XDDSnippet[]> {
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

  let url = `${basev1}/snippets`;

  const res = await axios.get(url, {
    params: {
      article_limit: 20,
      term: stratNames,
    },
    cancelToken: cancelToken,
    responseType: "json",
  });
  try {
    return res.data.success.data;
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
