import fetch from "node-fetch";
import { SETTINGS } from "~/settings";

const apiAddress = import.meta.env.VITE_MACROSTRAT_INGEST_API + "/sources";

export async function onBeforeRender(pageContext) {
  // `.page.server.js` files always run in Node.js; we could use SQL/ORM queries here.
  const url = new URL(apiAddress);
  url.searchParams.set("page_size", "9999");



  const response = await fetch(url.toString());
  const sources = await response.json();
  sources.sort((a, b) => a.source_id - b.source_id);

  const pageProps = {
    sources: sources,
    user: pageContext.user,
    url: pageContext.url,
    ingest_api: import.meta.env.VITE_MACROSTRAT_INGEST_API
  };
  return {
    pageContext: {
      pageProps
    },
  };
}
