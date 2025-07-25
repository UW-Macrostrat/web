import { apiDomain, apiV2Prefix } from "@macrostrat-web/settings";
import { fetchAPIData, fetchAPIRefs } from "~/_utils";

export async function data(pageContext) {
  const concept_id = parseInt(pageContext.urlParsed.pathname.split("/")[3]);

  // Await all API calls
  const [resData, fossilsData, refs1, refs2] = await Promise.all([
    fetch(
      `${apiDomain}/api/pg/strat_concepts_with_names?concept_id=eq.` +
        concept_id
    ).then((res) => res.json()),
    fetchAPIData("/fossils", { strat_name_concept_id: concept_id }),
    fetchAPIRefs("/fossils", { strat_name_concept_id: concept_id }),
    fetchAPIRefs("/columns", { concept_id }),
  ]);

  const refValues1 = refs1 ? Object.values(refs1) : [];
  const refValues2 = refs2 ? Object.values(refs2) : [];
  const refs = [...refValues1, ...refValues2];

  return { resData: resData[0], refs, fossilsData };
}
