import { apiV2Prefix } from "@macrostrat-web/settings";
import fetch from "node-fetch";

const apiAddress = apiV2Prefix + "/units";

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
