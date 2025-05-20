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
    fetchJSON(addr).then((res) => res.map((d) => processStratName(d, true))),
    fetchJSON(relURL).then((res) => postProcessRelationships(res)),
  ]);

  const pageProps = { data, relationships };
  return {
    pageContext: {
      pageProps,
    },
  };
}

function postProcessRelationships(data) {
  let res = [];
  // Only use the relationships for which we can assemble lith IDs
  // This way we skip some of the more confusing extractions...
  for (const d of data) {
    let atts = [];
    if (d.lith_att_id != null) {
      atts.push({
        id: d.lith_att_id,
        name: d.lith_att,
        type: d.lith_att_type,
      });
    }

    const lith = {
      id: d.lith_id,
      name: d.lith,
      color: d.lith_color,
      atts,
    };

    res.push({ ...d, lith });
  }

  return res;
}

function fetchJSON(url) {
  return fetch(url).then((res) => res.json());
}
