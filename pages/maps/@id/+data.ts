import { postgrestPrefix } from "@macrostrat-web/settings";
import type { PageContextServer } from "vike/types";
import { PostgrestClient } from "@supabase/postgrest-js";
import { render } from "vike/abort";

const client = new PostgrestClient(postgrestPrefix, {
  headers: { Accept: "application/geo+json" },
});

export async function data(pageContext: PageContextServer) {
  const { id } = pageContext.routeParams;

  // Check whether a map ID is structurally valid (a number).
  if (isNaN(parseInt(id))) {
    throw render(404, "Map IDs must be numbers.");
  }

  const feature = await fetchMapData(id);

  if (!feature) {
    throw render(404, "Map not found.");
  }

  return {
    mapInfo: feature?.properties,
    geometry: feature?.geometry,
  };
}

async function fetchMapData(id: string) {
  const res: any = await client.from("sources").select("*").eq("source_id", id);
  return res?.data?.features[0];
}
