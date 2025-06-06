import { apiDomain } from "@macrostrat-web/settings";

export async function data() {
  const url = `${apiDomain}/api/pg/strat_concepts_with_ids?limit=20&concept_id=gt.0&order=concept_id.asc`;
  const res = await fetch(url)
  .then((r) => {return r.json()});
  return { res };
}
