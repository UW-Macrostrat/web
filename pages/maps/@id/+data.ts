import { postgrestPrefix } from "@macrostrat-web/settings";
import type { PageContextServer } from "vike/types";
import { PostgrestClient } from "@supabase/postgrest-js";
import { render } from "vike/abort";

const client = new PostgrestClient(postgrestPrefix, {
  headers: { Accept: "application/geo+json" },
});

export async function data(pageContext: PageContextServer) {
  const { id } = pageContext.routeParams;

  const feature = await fetchMapData(id);

  if (!feature) {
    throw render(404, `No map matching '${id}'.`);
  }

  return {
    mapInfo: feature?.properties,
    geometry: feature?.geometry,
  };
}

/** A map is addressable by either identifier it has: the numeric `source_id`
 * that most links in the app carry, or the `slug`, which is the readable name
 * the compilation system and the CLI use throughout. Slugs are unique in
 * `maps.sources` and never all-digits, so the two spaces can't collide. */
async function fetchMapData(id: string) {
  let column = "slug";
  if (/^\d+$/.test(id)) {
    column = "source_id";
  }

  const res: any = await client.from("sources").select("*").eq(column, id);
  return res?.data?.features?.[0];
}
