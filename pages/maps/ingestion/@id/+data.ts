import { apiV2Prefix, postgrestPrefix } from "@macrostrat-web/settings";
import type { PageContextServer } from "vike/types";
import { PostgrestClient } from "@supabase/postgrest-js";

const apiAddress = apiV2Prefix + "/defs/sources/";

const client = new PostgrestClient(postgrestPrefix, {
  headers: { Accept: "application/geo+json" },
});

export async function data(pageContext: PageContextServer) {
  const { id } = pageContext.routeParams;

  const feature = await fetchMapData(id);

  return {
    mapInfo: feature?.properties,
    geometry: feature?.geometry,
  };
}

async function fetchMapData(id: string) {
  const res: any = await client.from("sources").select("*").eq("source_id", id);
  return res?.data?.features[0];
}

/**

export interface EditInterfaceProps {
  source: any;
  ingestProcess: any;
  source_id: number;
  mapBounds: any;
}
*/
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
    `${postgrestPrefix}/map_ingest?source_id=eq.${source_id}`
  );
  const ingestProcesses = await ingest_processes_response.json();
  const ingestProcess = ingestProcesses[0];

  const source_response = await fetch(
    `${postgrestPrefix}/maps_sources?source_id=eq.${source_id}&select=*`
  );
  const sources = await source_response.json();
  const source = sources[0];

  return {
    source,
    ingestProcess,
    source_id,
    mapBounds: map,
  };
}
