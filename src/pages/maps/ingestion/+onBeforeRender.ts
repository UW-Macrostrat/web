import { ingestPrefix } from "@macrostrat-web/settings";


export async function onBeforeRender(pageContext) {

  const response = await fetch(`${ingestPrefix}/ingest-process?source_id=order_by&source_id=not.is.null&state=eq.ingested&page_size=1000`);
  const ingest_processes = await response.json();

  const pageProps = {
    sources: ingest_processes.map(x => x.source),
    user: pageContext.user,
    ingest_api: ingestPrefix,
  };
  return {
    pageContext: {
      pageProps,
    },
  };
}
