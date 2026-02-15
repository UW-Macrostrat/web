import { SETTINGS, apiV2Prefix } from "@macrostrat-web/settings";
import axios from "axios";
import { joinURL } from "@macrostrat/ui-components";
import { ColumnGeoJSONRecord } from "./columns";
import { UPDATE_COLUMN_FILTERS } from "../reducers/core/types";

export const base = apiV2Prefix;
const pbdbURL = `${SETTINGS.pbdbDomain}/data1.2/colls/list.json`;
const pbdbURLOccs = `${SETTINGS.pbdbDomain}/data1.2/occs/list.json`;

import { FilterType } from "./filters";

type PossibleFields = {
  [Property in FilterType]: string[];
};

function buildColumnQueryParams(filters) {
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
  for (let key in query) {
    query[key] = query[key].join(",");
  }

  return query;
}

export async function fetchFilteredColumns(
  providedFilters
): Promise<UPDATE_COLUMN_FILTERS | void> {
  let queryString = buildColumnQueryParams(providedFilters);
  let url = `${base}/columns`;
  if (Object.keys(queryString).length === 0) {
    return;
  }
  let res = await axios.get(url, {
    params: {
      format: "geojson_bare",
      ...queryString,
    },
    responseType: "json",
  });

  // TODO: report errors
  return {
    type: "update-column-filters",
    columns: res.data.features,
  };
}

function addMapIdToRef(data) {
  data.success.data.mapData = data.success.data.mapData.map((source) => {
    source.ref.map_id = source.map_id;
    return source;
  });
  return data;
}

export async function fetchAllColumns(): Promise<ColumnGeoJSONRecord[]> {
  let res = await axios.get(joinURL(base, "columns"), {
    responseType: "json",
    params: { format: "geojson_bare", all: true },
  });

  return res.data.features;
}

export async function runMapQuery(lng, lat, z, map_id, cancelToken) {
  const params = { lng, lat, z, map_id };
  let url = base + "/mobile/map_query_v2";
  let res = await axios.get(url, { cancelToken, responseType: "json", params });
  let data = addMapIdToRef(res.data).success.data;

  // if (data.hasColumns) {
  //   // TODO: fix this...
  //   // Somewhat ridiculously, we need to run a separate query to get the
  //   // column ID, because the map query doesn't return it.
  //   // This needs to get a lot better.
  //   const pointData = await axios.get(base + "/mobile/point", {
  //     params: {
  //       lng,
  //       lat,
  //       z,
  //     },
  //   });
  //   const col_id = pointData.data.success.data.col_id;
  //   data.col_id = col_id;
  // }

  return data;
}

export async function runColumnQuery(column, cancelToken) {
  const res = await axios.get(base + "/units", {
    cancelToken,
    responseType: "json",
    params: { response: "long", col_id: column.col_id },
  });
  try {
    return res.data.success.data;
  } catch (error) {
    return [];
  }
}

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
        coll_id,
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
