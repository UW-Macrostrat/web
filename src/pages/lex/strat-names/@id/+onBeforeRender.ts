import { postgrestPrefix } from "@macrostrat-web/settings";
import fetch from "node-fetch";
import { processStratName } from "../data-service";

const apiAddress = postgrestPrefix + "/strat_names_units_kg?id=eq.";

export async function onBeforeRender(pageContext) {
  // `.page.server.js` files always run in Node.js; we could use SQL/ORM queries here.
  const strat_name_id = pageContext.routeParams.id;

  const addr = apiAddress + strat_name_id;

  const relURL =
    postgrestPrefix +
    "/strat_name_kg_relationships?strat_name_id=eq." +
    strat_name_id;

  const [data, relationships] = await Promise.all([
    fetchJSON(addr).then((res) => res.map(processStratName)),
    fetchJSON(relURL),
  ]);

  const pageProps = { data, relationships };
  return {
    pageContext: {
      pageProps,
    },
  };
}

function fetchJSON(url) {
  return fetch(url).then((res) => res.json());
}
