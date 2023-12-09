import fetch from "node-fetch";
import { SETTINGS } from "~/pages/map/map-interface/settings";

const apiAddress = SETTINGS.apiDomain + "/api/v2/units";

export async function onBeforeRender(pageContext) {
  // `.page.server.js` files always run in Node.js; we could use SQL/ORM queries here.
  const col_id = pageContext.routeParams.id;
  const response = await fetch(apiAddress + "?col_id=" + col_id);
  const res = await response.json();
  const units = res.success.data;

  const pageProps = { units, col_id };
  return {
    pageContext: {
      pageProps,
    },
  };
}
