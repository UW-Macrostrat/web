import { postgrestPrefix } from "@macrostrat-web/settings";
import type { PageContextServer } from "vike/types";
import { PostgrestClient } from "@supabase/postgrest-js";

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
