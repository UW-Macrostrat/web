import { apiDomain } from "@macrostrat-web/settings";

export async function data() {
  const url = `${apiDomain}/api/pg/strat_combined?limit=20&combined_id=gt.0&order=combined_id.asc`;
  const res = await fetch(url).then((r) => {
    return r.json();
  });
  return { res };
}
