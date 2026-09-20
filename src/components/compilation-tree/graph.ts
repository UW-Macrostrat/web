/** The compilation graph — maps assembled out of other maps.
 *
 * Served by api-v3 at `/compilations/graph`: a few hundred nodes and edges, far
 * smaller than the map catalog, so a client holds all of it and does its
 * filtering, grouping and selection locally. That is the difference between this
 * and walking the hierarchy a level per request, which can only ever answer for
 * what has been expanded.
 *
 * Nothing in the database marks a compilation as a *kind* — "is a compilation"
 * means *has members* — so every distinction below is a derived flag.
 */

import { apiV3Prefix } from "@macrostrat-web/settings";

export type CompilationState = "virtual" | "current" | "stale" | "ingested";

export interface GraphNode {
  source_id: number;
  slug: string;
  name: string | null;
  scale: string | null;
  /** A compilation served as a tile layer. Structural — a container, not a map
   * anyone means to look at. */
  is_served_layer: boolean;
  /** Has members. */
  is_compilation: boolean;
  /** Holds polygons of its own, so identity resolution stops here. */
  holds_polygons: boolean;
  /** A compilation that replaced its constituents. */
  is_materialized: boolean;
  /** A member of a mosaic: a real source whose footprint is its extent and whose
   * content is the mosaic's inside it. No polygons, linework or faces of its own. */
  is_mosaic_member: boolean;
  n_members: number;
  n_sources: number;
  content: "ingested" | "derived" | null;
  assembly_mode: string | null;
  state: CompilationState | null;
  area_km: number | null;
  /** In no compilation at all — an ingested map nothing has wrapped yet. */
  is_standalone: boolean;
  /** Stage I supersession: the map that replaced this one. Often the reason a
   * map sits outside every compilation. */
  superseded_by: number | null;
  /** The layer this node *is*, when it is a served layer. */
  map_layer: number | null;
  min_zoom: number | null;
  max_zoom: number | null;
  /** The layer whose faces represent this map. A served layer is one, so it has
   * none of its own. */
  placed_in_layer: number | null;
}

export interface GraphEdge {
  compilation_id: number;
  member_id: number;
  /** Higher wins where members overlap; null in a disjoint mosaic. */
  priority: number | null;
  role: string | null;
}

export interface CompilationGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export const emptyGraph: CompilationGraph = { nodes: [], edges: [] };

export const nodeName = (node: GraphNode) => node.name ?? node.slug;

/** Fetch the whole graph, optionally narrowed to the compilations covering a
 * point. One helper because three call sites want the same URL: the compilations
 * page's server-side load, its point inspector, and the topology page's
 * client-side load. */
export async function fetchCompilationGraph(
  options: { lng?: number; lat?: number; signal?: AbortSignal } = {}
): Promise<CompilationGraph> {
  const { lng, lat, signal } = options;

  const base = `${apiV3Prefix}/compilations`.replace(/\/$/, "") + "/graph";
  const params = new URLSearchParams();
  if (lng != null && lat != null) {
    // 5 decimal places (~1 m) is past the resolution of any Macrostrat dataset,
    // and keeps the URL stable so an unchanged click doesn't refetch.
    params.set("lng", lng.toFixed(5));
    params.set("lat", lat.toFixed(5));
  }
  const query = params.toString();

  let url = base;
  if (query !== "") url = `${base}?${query}`;

  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`Could not load the compilation graph: ${res.statusText}`);
  }
  return await res.json();
}

/** Where a map's own page lives. Slugs are unique in `maps.sources` and never
 * all-digits, so `/maps/<slug>` and `/maps/<source_id>` share a route without
 * colliding; the slug is the readable form the CLI and the compilation system
 * use throughout. */
export function mapPageHref(node: { slug: string | null; source_id: number }) {
  return `/maps/${node.slug ?? node.source_id}`;
}

/** Scale bands, coarsest first — the order they mean something in, which is not
 * alphabetical. */
export const scaleOrder = ["tiny", "small", "medium", "large"];
