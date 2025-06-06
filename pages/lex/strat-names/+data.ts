import { apiDomain } from "@macrostrat-web/settings";

export async function data() {
  const url = `${apiDomain}/api/pg/strat_names_test?limit=20&id=gt.0&order=id.asc`;
  const res = await fetch(url).then((r) => {
    return r.json();
  });
  return { res };
}
