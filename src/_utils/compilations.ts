/** Compilations, as the map pages draw and describe them.
 *
 * A compilation is any source the tileserver serves by slug at
 * `/map/{slug}/{z}/{x}/{y}`, that API v2's `map_query_v2` answers a point for
 * with `?source=`. `carto` is Macrostrat's served map,
 * public and cached. `sys:carto-legacy` is the materialized
 * build it replaces, addressed the same way so the two can be compared with
 * nothing but the name changing; it is not a `maps.sources` row, so it is
 * listed here rather than by the API. Every other compilation is drawn per
 * request and needs the delegated token below.
 *
 * With no compilation chosen, `/map` names none: it draws `/carto-slim` and asks
 * `map_query_v2` without a `source`, and each environment's servers decide
 * which build answers both.
 */
import { getTileToken } from "./tile-token";
import {
  apiV3Prefix,
  burwellTileDomain,
  mapTilesToken,
} from "@macrostrat-web/settings";
import { atom } from "jotai";
import { loadable } from "jotai/utils";
import type mapboxgl from "mapbox-gl";

export const DEFAULT_COMPILATION = "carto";
export const LEGACY_COMPILATION = "sys:carto-legacy";

/** The fields of API v3's `/compilations` summary the map pages read. */
export interface CompilationSummary {
  source_id: number;
  slug: string;
  name: string | null;
  scale: string | null;
  /** The zoom band the compilation's scale answers for; both null when it has
   * no scale and answers at every zoom (`carto`). `max_zoom` null means open. */
  min_zoom: number | null;
  max_zoom: number | null;
  is_served: boolean;
  is_compilation: boolean;
  has_faces: boolean;
  is_materialized: boolean;
  assembly_mode: string | null;
  n_sources: number | null;
}

const LEGACY_ENTRY: CompilationSummary = {
  source_id: -1,
  slug: LEGACY_COMPILATION,
  name: "Carto (legacy build)",
  scale: null,
  min_zoom: null,
  max_zoom: null,
  is_served: true,
  is_compilation: true,
  has_faces: false,
  is_materialized: true,
  assembly_mode: null,
  n_sources: null,
};

/** A compilation the tileserver can draw by name: served, and either solved
 * (has faces), holding polygons, or multiscale over such members. */
function isDrawable(c: CompilationSummary): boolean {
  if (!c.is_served || !c.is_compilation) return false;
  return c.has_faces || c.is_materialized || c.assembly_mode == "multiscale";
}

function byName(a: CompilationSummary, b: CompilationSummary) {
  return (a.name ?? a.slug).localeCompare(b.name ?? b.slug);
}

/** Every compilation the pages can offer: `carto`, the legacy build, then the
 * rest by name. */
export async function fetchCompilations(): Promise<CompilationSummary[]> {
  const res = await fetch(`${apiV3Prefix}/compilations`);
  if (!res.ok) throw new Error(`Compilations request failed (${res.status})`);
  const data: CompilationSummary[] = await res.json();
  const drawable = data.filter(isDrawable);
  const carto = drawable.filter((c) => c.slug == DEFAULT_COMPILATION);
  const rest = drawable
    .filter((c) => c.slug != DEFAULT_COMPILATION)
    .sort(byName);
  return [...carto, LEGACY_ENTRY, ...rest];
}

export const compilationsAtom = loadable(atom(fetchCompilations));

function isUnset(slug: string | null | undefined): boolean {
  return slug == null || slug == "";
}

/** A slug for pages that must name one, such as the inspector and diff pages. */
export function compilationOrDefault(slug: string | null | undefined): string {
  if (isUnset(slug)) return DEFAULT_COMPILATION;
  return slug;
}

/** The `source` for `map_query_v2`: none when unset, so the API's default
 * answers. */
export function mapQuerySource(slug: string | null | undefined): string | null {
  if (isUnset(slug)) return null;
  return slug;
}

export function compilationLabel(c: CompilationSummary): string {
  const name = c.name ?? c.slug;
  if (c.n_sources == null) return name;
  return `${name} (${c.n_sources} maps)`;
}

export function compilationTilesURL(slug: string | null): string {
  return `${burwellTileDomain}/map/${compilationOrDefault(slug)}/{z}/{x}/{y}`;
}

/** Point the Macrostrat style's `burwell` source at a compilation's tiles.
 * `buildMacrostratStyle` hard-codes `/carto-slim`; until it takes a compilation
 * option this rewrites the source in place, keeping every layer as built. */
export function applyCompilationTiles(
  style: mapboxgl.Style,
  slug: string | null
): mapboxgl.Style {
  // The style's own `/carto-slim` is the tileserver's default build.
  if (isUnset(slug)) return style;
  const source = style.sources?.["burwell"] as
    | mapboxgl.VectorSource
    | undefined;
  if (source != null) {
    source.tiles = [compilationTilesURL(slug)];
  }
  return style;
}

const tilesPrefix = `${burwellTileDomain}/map/`;

/** Attach the tile token to compilation tile requests: the short-lived one the
 * web server mints (`~/_utils/tile-token`), else the static delegated token
 * while a deployment has no signing key. Read on every request, so a refreshed
 * token applies to the next tile. The tileserver ignores it for the public
 * slugs, so it is sent for every `/map/` tile. */
export const tileRequestTransform: mapboxgl.TransformRequestFunction = (
  url,
  resourceType
) => {
  const token = getTileToken() ?? mapTilesToken;
  if (token == null) return { url };
  if (resourceType != "Tile" || !url.startsWith(tilesPrefix)) return { url };
  return { url, headers: { Authorization: `Bearer ${token}` } };
};

/** Why the map's zoom is outside the band a scale-dependent compilation is
 * meant for, or null when it is inside or the compilation has no band. The
 * tiles still draw -- a compilation answers at any zoom -- but at the wrong
 * scale the picture is misleading: `carto-small` at zoom 12 is a small-scale
 * map stretched over a large-scale view. */
export function zoomBandWarning(
  compilation: CompilationSummary | null,
  zoom: number | null
): string | null {
  if (compilation == null || zoom == null) return null;
  const { min_zoom, max_zoom, scale } = compilation;
  if (min_zoom == null && max_zoom == null) return null;
  const z = Math.round(zoom);
  const below = min_zoom != null && z < min_zoom;
  const above = max_zoom != null && z > max_zoom;
  if (!below && !above) return null;

  let band: string;
  if (max_zoom == null) {
    band = `zoom ${min_zoom} and above`;
  } else if (min_zoom == null) {
    band = `zoom ${max_zoom} and below`;
  } else {
    band = `zooms ${min_zoom} to ${max_zoom}`;
  }
  const name = compilation.name ?? compilation.slug;
  return `${name} is a ${scale}-scale compilation, meant for ${band}. The map is at zoom ${z}.`;
}
