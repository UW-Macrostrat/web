import { ingestPrefix } from "@macrostrat-web/settings";
import fetch from "node-fetch";

export async function onBeforeRender(pageContext) {
  // `.page.server.js` files always run in Node.js; we could use SQL/ORM queries here.
  const response = await fetch(`${ingestPrefix}/ingest-process?source_id=not.is.null&state=eq.ingested`);
  const ingest_processes = await response.json();

  const sources = await Promise.all(ingest_processes.map(async x => {

    const source_id = x.source_id;
    const response = await fetch(`${ingestPrefix}/sources/${source_id}`);

    const data = await response.json()

    return data
  }))


  sources.sort((a, b) => b.source_id - a.source_id);

  const pageProps = {
    sources: sources,
    user: pageContext.user,
    ingest_api: ingestPrefix,
  };
  return {
    pageContext: {
      pageProps,
    },
  };
}
