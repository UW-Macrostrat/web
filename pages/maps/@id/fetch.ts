import { useAPIResult } from "@macrostrat/ui-components";
import { apiV2Prefix, gddDomain, pbdbDomain } from "@macrostrat-web/settings";

export function fetchMapInfo(lng, lat, z) {
  return useAPIResult(`${apiV2Prefix}/mobile/map_query_v2`, {
    lng,
    lat,
    z,
  })?.success?.data;
}

export function fetchColumnInfo(lng, lat) {
  return useAPIResult(`${apiV2Prefix}/columns`, {
    lat,
    lng,
    response: "long",
  })?.success?.data?.[0];
}

export function fetchXddInfo(stratNames) {
  return useAPIResult(`${gddDomain}/api/v1/snippets`, {
    article_limit: 20,
    term: stratNames?.map((d) => d.rank_name).join(","),
  })?.success?.data;
}

export function fetchFossilInfo(lng, lat) {
  const collectionResponse = useAPIResult(
    `${pbdbDomain}/data1.2/colls/list.json?lngmin=${lng - 0.1}&lngmax=${lng + 0.1}&latmin=${lat - 0.1}&latmax=${lat + 0.1}`,
  )?.records;

  const occurrences = useAPIResult(
    `${pbdbDomain}/data1.2/occs/list.json?lngmin=${lng - 0.1}&lngmax=${lng + 0.1}&latmin=${lat - 0.1}&latmax=${lat + 0.1}`,
  )?.records;

  if (!collectionResponse || !occurrences) {
    return null;
  }

  try {
    return collectionResponse.map((col) => {
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