import { apiV2Prefix, ingestPrefix } from "@macrostrat-web/settings";
import { PageContextBuiltInServer } from "vike/types";

const apiAddress = apiV2Prefix + "/defs/sources/";

export async function onBeforeRender(pageContext: PageContextBuiltInServer) {
  const { id } = pageContext.routeParams;

  // API v2 query
  const params = new URLSearchParams({
    format: "geojson",
    source_id: id,
  });
  const response = await fetch(apiAddress + "?" + params);
  const data: any = await response.json();
  const map = data?.success?.data?.features[0];

  // API v3 query
  const ingest_processes_response = await fetch(
    `${ingestPrefix}/ingest-process?source_id=eq.${id}`
  );
  const ingestProcesses = await ingest_processes_response.json();
  const ingestProcess = ingestProcesses[0];

  const source = ingestProcess["source"];

  return {
    pageContext: {
      pageProps: {
        source_id: id,
        mapBounds: map,
        source,
        ingestProcess,
      },
      documentProps: {
        // The page's <title>
        title: source.name,
      },
    },
  };
}
