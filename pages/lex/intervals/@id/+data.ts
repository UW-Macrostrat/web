import { pbdbDomain } from "@macrostrat-web/settings";
import { fetchAPIData, fetchAPIRefs } from "~/_utils";

export async function data(pageContext) {
  const int_id = parseInt(pageContext.urlParsed.pathname.split("/")[3]);

  // Await all API calls
  const [resData, colData, unitsData, fossilsData, refs1, refs2] =
    await Promise.all([
      fetchAPIData("/defs/intervals", { int_id }),
      fetchAPIData("/columns", { int_id, response: "long", format: "geojson" }),
      fetchAPIData("/units", { int_id }),
      fetchAPIData("/fossils", { int_id }),
      fetchAPIRefs("/fossils", { int_id }),
      fetchAPIRefs("/columns", { int_id }),
    ]);

  const refValues1 = Object.values(refs1);
  const refValues2 = Object.values(refs2);
  const refs = [...refValues1, ...refValues2];

  const cols = colData.features
    ?.map((feature) => feature.properties.col_id)
    ?.join(",");

  let taxaData = null;
  if (cols) {
    const response = await fetch(
      `${pbdbDomain}/data1.2/occs/prevalence.json?limit=5&coll_id=${cols}`
    );
    taxaData = await response.json();
  }

  return {
    resData: resData[0],
    colData,
    taxaData,
    refs,
    unitsData,
    fossilsData,
  };
}
