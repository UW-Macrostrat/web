import fetch from "node-fetch";
import { apiV2Prefix } from "~/settings";

const apiAddress = apiV2Prefix + "/defs/sources";

export async function onBeforeRender(pageContext) {
  // `.page.server.js` files always run in Node.js; we could use SQL/ORM queries here.
  const response = await fetch(apiAddress + "?format=json");
  const res = await response.json();
  let sources = res.success.data;
  sources.sort((a, b) => a.source_id - b.source_id);

  const pageProps = { sources };
  return {
    pageContext: {
      pageProps,
    },
  };
}
