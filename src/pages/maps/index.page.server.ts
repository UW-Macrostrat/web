import fetch from "node-fetch";
import { SETTINGS } from "~/map-interface/settings";

const apiAddress = SETTINGS.apiDomain + "/api/v2/defs/sources";

export async function onBeforeRender(pageContext) {
  // `.page.server.js` files always run in Node.js; we could use SQL/ORM queries here.
  const response = await fetch(apiAddress + "?format=json");
  const res = await response.json();
  const sources = res.success.data;

  const pageProps = { sources };
  return {
    pageContext: {
      pageProps,
    },
  };
}
