import { apiV2Prefix } from "@macrostrat-web/settings";
import { fetchAPIData } from "~/_utils";

export async function data(pageContext) {
  const concept_id = parseInt(pageContext.urlParsed.pathname.split("/")[3]);

  // Await all API calls
  const [res, fossilRes, colData] = await Promise.all([
    fetchAPIData("/defs/strat_name_concepts", { concept_id }),
    (await fetch(apiV2Prefix + "/fossils?strat_name_concept_id=" + concept_id)).json(),
    (await fetch(apiV2Prefix + "/columns?strat_name_concept_id=" + concept_id + "&response=long&format=geojson")).json(),
  ]);

  const cols = colData.success.data.features
    ?.map((feature) => feature.properties.col_id)
    ?.join(",");

  let taxaData = null;
  if (cols) {
    const response = await fetch(
      `https://paleobiodb.org/data1.2/occs/prevalence.json?limit=5&coll_id=${cols}`
    );
    taxaData = await response.json();
  }

  return { res, fossilRes, colData, taxaData };
}
