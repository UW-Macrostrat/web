import { pbdbDomain } from "@macrostrat-web/settings";
import { fetchAPIData, fetchAPIRefs } from "~/_utils";

export async function data(pageContext) {
  const col_group_id = parseInt(pageContext.urlParsed.pathname.split("/")[3]);

  // Await all API calls
  const [resData, colData, refs1, refs2] = await Promise.all([
    fetchAPIData("/defs/groups", { col_group_id }),
    fetchAPIData("/columns", {
      col_group_id,
      response: "long",
      format: "geojson",
    }),
    fetchAPIRefs("/fossils", { col_group_id }),
    fetchAPIRefs("/columns", { col_group_id }),
  ]);

  const refValues1 = Object.values(refs1);
  const refValues2 = Object.values(refs2);
  const refs = [...refValues1, ...refValues2];

  const cols = colData?.features
    ?.map((feature) => feature.properties.col_id)
    ?.join(",");

  let taxaData = null;
  if (cols) {
    const response = await fetch(
      `${pbdbDomain}/data1.2/occs/prevalence.json?limit=5&coll_id=${cols}`
    );
    taxaData = await response.json();
  }

  return { resData: resData[0], colData, taxaData, refs };
}
