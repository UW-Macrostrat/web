import { apiV2Prefix } from "@macrostrat-web/settings";
import fetch from "node-fetch";

const apiAddress = apiV2Prefix + "/defs/projects";

export async function onBeforeRender(pageContext) {
  // `.page.server.js` files always run in Node.js; we could use SQL/ORM queries here.
  const response = await fetch(apiAddress + "?all");
  const res = await response.json();
  let projects = res.success.data;

  return {
    pageContext: {
      pageProps: {
        projects,
      },
    },
  };
}
