import { postgrestPrefix } from "@macrostrat-web/settings";
import type { PageContextServer } from "vike/types";
import { PostgrestClient } from "@supabase/postgrest-js";
import { render } from "vike/abort";

import { tileJSONURL, type TileJSON } from "./tilejson";
import type { MapRef } from "~/components/map-info";

const client = new PostgrestClient(postgrestPrefix, {
  headers: { Accept: "application/geo+json" },
});

export async function data(pageContext: PageContextServer) {
  const { id } = pageContext.routeParams;

  const feature = await fetchMapData(id);

  if (!feature) {
    throw render(404, `No map matching '${id}'.`);
  }

  const tileJSON = await fetchTileJSON(feature.properties.slug ?? id);

  // PostgREST's GeoJSON gives a source without `rgeom` `{"type": null}`: a
  // compilation, whose extent is its bounds, which the TileJSON carries.
  let geometry = feature.geometry;
  if (geometry?.type == null) {
    geometry = boundsPolygon(tileJSON?.bounds ?? [-180, -90, 180, 90]);
  }

  const refs = await fetchMapRefs(feature.properties.source_id);

  return {
    mapInfo: { ...feature.properties, refs },
    geometry,
    tileJSON,
  };
}

/** The map's own references, labelled and ordered. Empty where the database
 * has no `macrostrat_api.map_refs`, or the map no links yet. */
async function fetchMapRefs(sourceID: number): Promise<MapRef[]> {
  const query = new URLSearchParams({
    source_id: `eq.${sourceID}`,
    order: "position,ref_id",
  });
  try {
    const res = await fetch(`${postgrestPrefix}/map_refs?${query}`);
    if (!res.ok) return [];
    return await res.json();
  } catch (error) {
    console.error(`Could not load the references of map ${sourceID}:`, error);
    return [];
  }
}

/** The source's tile URL, bounds and zoom range (`/map/<slug>/tilejson.json`).
 * Null for a source that is not served, which has no tiles to draw. */
async function fetchTileJSON(ident: string): Promise<TileJSON | null> {
  try {
    const res = await fetch(tileJSONURL(ident));
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error(`Could not load the TileJSON of '${ident}':`, error);
    return null;
  }
}

function boundsPolygon([west, south, east, north]: number[]): GeoJSON.Polygon {
  return {
    type: "Polygon",
    coordinates: [
      [
        [west, south],
        [east, south],
        [east, north],
        [west, north],
        [west, south],
      ],
    ],
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
