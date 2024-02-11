import { postgrestPrefix } from "@macrostrat-web/settings";
import fetch from "node-fetch";
import { processStratName } from "./data-service";

const apiAddress =
  postgrestPrefix + "/strat_names_units_kg?kg_liths=not.is.null";

export async function onBeforeRender(pageContext) {
  // `.page.server.js` files always run in Node.js; we could use SQL/ORM queries here.
  console.log("Page context", pageContext);

  const addr = apiAddress + "&limit=20";
  console.log("Fetching", addr);

  const response = await fetch(addr);
  const res = await response.json();

  const data = res.map(processStratName);

  const pageProps = { data };
  return {
    pageContext: {
      pageProps,
    },
  };
}
