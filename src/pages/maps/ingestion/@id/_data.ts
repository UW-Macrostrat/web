import { apiV2Prefix, ingestPrefix } from "@macrostrat-web/settings";

const apiAddress = apiV2Prefix + "/defs/sources/";

export interface EditInterfaceProps {
  source: any;
  ingestProcess: any;
  source_id: number;
  mapBounds: any;
}

export async function getIngestProcessData(
  source_id: number
): Promise<EditInterfaceProps> {
  // API v2 query
  const params = new URLSearchParams({
    format: "geojson",
    source_id: `${source_id}`,
  });
  const response = await fetch(apiAddress + "?" + params);
  const data: any = await response.json();
  const map = data?.success?.data?.features[0];

  // API v3 query
  const ingest_processes_response = await fetch(
    `${ingestPrefix}/ingest-process?source_id=eq.${source_id}`
  );
  const ingestProcesses = await ingest_processes_response.json();
  const ingestProcess = ingestProcesses[0];
  const source = ingestProcess["source"];

  return {
    source,
    ingestProcess,
    source_id,
    mapBounds: map,
  };
}
