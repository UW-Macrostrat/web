import { apiDomain, pbdbDomain } from "@macrostrat-web/settings";
import { fetchAPIData, fetchAPIRefs } from "~/_utils";
import { getPrevalentTaxa } from "~/components/lex/data-helper";

export async function data(pageContext) {
  const concept_id = parseInt(pageContext.urlParsed.pathname.split("/")[3]);

  // Await all API calls
  const [resData, fossilsData, colData, refs1, refs2, unitsData] = await Promise.all([
    fetch(
      `${apiDomain}/api/pg/strat_concepts_with_names?concept_id=eq.` +
        concept_id
    ).then((res) => res.json()),
    fetchAPIData("/fossils", { strat_name_concept_id: concept_id }),
    fetchAPIData("/columns", { strat_name_concept_id: concept_id, response: "long", format: "geojson" }),
    fetchAPIRefs("/fossils", { strat_name_concept_id: concept_id }),
    fetchAPIRefs("/columns", { strat_name_concept_id: concept_id }),
    fetchAPIData("/units", { strat_name_concept_id: concept_id }),
  ]);

  const refValues1 = refs1 ? Object.values(refs1) : [];
  const refValues2 = refs2 ? Object.values(refs2) : [];
  const refs = [...refValues1, ...refValues2];

  const taxaData = await getPrevalentTaxa(fossilsData);

  return { resData: resData[0], refs, fossilsData, colData, taxaData, unitsData };
}
