import { pbdbDomain } from "@macrostrat-web/settings";
import { fetchAPIData, fetchAPIRefs } from "~/_utils";
import { getPrevalentTaxa } from "~/components/lex/data-helper";

export async function data(pageContext) {
  const strat_name_id = parseInt(pageContext.urlParsed.pathname.split("/")[3]);

  // Await all API calls
  const [resData, colData, fossilsData, mapsData, refs1, refs2, unitsData] =
    await Promise.all([
      fetchAPIData("/defs/strat_names", { strat_name_id }),
      fetchAPIData("/columns", {
        strat_name_id,
        response: "long",
        format: "geojson",
      }),
      fetchAPIData("/fossils", { strat_name_id, format: "geojson" }),
      fetchAPIData("/geologic_units/map/legend", { strat_name_id, sample: "true" }),
      fetchAPIRefs("/fossils", { strat_name_id }),
      fetchAPIRefs("/columns", { strat_name_id }),
      fetchAPIData("/units", { strat_name_id }),
    ]);

  const refValues1 = Object.values(refs1);
  const refValues2 = Object.values(refs2);
  const refs = [...refValues1, ...refValues2];

  const taxaData = await getPrevalentTaxa(fossilsData);

  return {
    resData: resData[0],
    colData,
    taxaData,
    refs,
    fossilsData,
    mapsData,
    unitsData,
  };
}
