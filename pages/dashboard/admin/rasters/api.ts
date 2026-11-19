/** The raster index's management API: PostgREST over the `raster_api` schema.
 * Requests carry the session cookie, and the views are granted to `web_admin`
 * only, so any other session is refused by the database. */
import { apiV3Prefix } from "@macrostrat-web/settings";
import { PostgrestClient } from "@supabase/postgrest-js";

export const rastersEndpoint = `${apiV3Prefix}/rasters/pg`;

export const rastersURL = "/dashboard/admin/rasters";
export const inboxURL = `${rastersURL}/inbox`;
export const scanTaskURL = "/dashboard/admin/tasks/rasters.scan";

/** Page addresses under `rastersURL` that a layer slug would collide with. */
export const RESERVED_SLUGS = ["inbox"];

export interface LayerRow {
  slug: string;
  name: string | null;
  description: string | null;
  minzoom: number | null;
  maxzoom: number | null;
  rescale_range: number[] | null;
  raster_count: number;
}

export interface RasterRow {
  id: number;
  /** Null while the raster is in the inbox. */
  layer: string | null;
  slug: string;
  href: string;
  host: string | null;
  minzoom: number | null;
  maxzoom: number | null;
  dtype: string | null;
  nbands: number | null;
  nodata: number | null;
  crs: string | null;
  rescale_range: number[] | null;
  created_at: string;
  updated_at: string;
}

/** The layer on a map, drawn from what its row in the index holds. */
export function layerMapURL(slug: string): string {
  return `/dev/map/rasters/${encodeURIComponent(slug)}`;
}

/** One raster on the map. In a layer it is drawn through the layer, keeping
 * the layer's colors and classes; with no layer, by itself from its own file. */
export function rasterMapURL(
  raster: Pick<RasterRow, "id" | "layer" | "slug">
): string {
  if (raster.layer == null) return `/dev/map/rasters/raster/${raster.id}`;
  const dataset = encodeURIComponent(raster.slug);
  return `${layerMapURL(raster.layer)}?dataset=${dataset}`;
}

export function layerURL(slug: string): string {
  return `${rastersURL}/${encodeURIComponent(slug)}`;
}

function client() {
  return new PostgrestClient(rastersEndpoint, {
    fetch: (url, init) => fetch(url, { ...init, credentials: "include" }),
  });
}

function unwrap<T>(res: { data: T | null; error: any }): T {
  if (res.error != null) throw new Error(res.error.message ?? "Request failed");
  return res.data as T;
}

export async function fetchLayers(): Promise<LayerRow[]> {
  return unwrap(await client().from("layers").select("*").order("slug"));
}

export async function createLayer(
  slug: string,
  name: string | null
): Promise<void> {
  unwrap(await client().from("layers").insert({ slug, name }));
}

/** The editable fields of a layer. Sent alone: `raster_count` is read-only in
 * the view, and a request naming it is refused. */
export async function updateLayer(row: LayerRow): Promise<void> {
  const fields = {
    name: emptyToNull(row.name),
    description: emptyToNull(row.description),
    minzoom: toInteger(row.minzoom),
    maxzoom: toInteger(row.maxzoom),
  };
  unwrap(await client().from("layers").update(fields).eq("slug", row.slug));
}

/** Move rasters to a layer, or back to the inbox with `null`. */
export async function assignRasters(
  ids: number[],
  layer: string | null
): Promise<void> {
  unwrap(await client().from("rasters").update({ layer }).in("id", ids));
}

export async function countInbox(): Promise<number> {
  const res = await client()
    .from("rasters")
    .select("id", { count: "exact", head: true })
    .is("layer", null);
  if (res.error != null) throw new Error(res.error.message);
  return res.count ?? 0;
}

function emptyToNull(value: string | null): string | null {
  if (value == null || value.trim() === "") return null;
  return value;
}

// Cells edited in the sheet arrive as text.
function toInteger(value: number | string | null): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isInteger(n)) throw new Error(`${value} is not a whole number`);
  return n;
}
