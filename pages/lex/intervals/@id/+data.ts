import { apiV2Prefix, pbdbDomain } from "@macrostrat-web/settings";
import { fetchAPIData } from "~/_utils";

export async function data(pageContext) {
  const int_id = parseInt(pageContext.urlParsed.pathname.split("/")[3]);

  // Await all API calls
  const [res, fossilRes, colData] = await Promise.all([
    fetchAPIData("/defs/intervals", { int_id }),
    (await fetch(apiV2Prefix + "/fossils?int_id=" + int_id)).json(),
    (
      await fetch(
        apiV2Prefix +
          "/columns?int_id=" +
          int_id +
          "&response=long&format=geojson"
      )
    ).json(),
  ]);

  const cols = colData.success.data.features
    ?.map((feature) => feature.properties.col_id)
    ?.join(",");

  let taxaData = null;
  if (cols) {
    const response = await fetch(
      `${pbdbDomain}/data1.2/occs/prevalence.json?limit=5&coll_id=${cols}`
    );
    taxaData = await response.json();
  }

  return { res, fossilRes, colData, taxaData };
}
