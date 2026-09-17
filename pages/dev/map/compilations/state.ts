/** Page state for the compilation browser.
 *
 * The graph itself is seeded from `+data.ts` and never refetched; everything
 * here is derived from it or is view state. What's worth sharing goes in the
 * query string — the focused compilation, the inspected point, the map settings
 * — while selection stays in memory, since it's a working set rather than a
 * view.
 */

import { atom } from "jotai";
import { locationAtom } from "~/_utils/url-atoms";
import { Basemap } from "~/components";
import {
  emptyGraph,
  flattenGraph,
  type CompilationGraph,
  type GraphEdge,
  type GraphNode,
} from "./graph";

export interface Point {
  lng: number;
  lat: number;
}

/* ------------------------------------------------------------- the graph */

/** Seeded by `HybridPage`'s `initialAtoms` from the server-side fetch. */
export const graphAtom = atom<CompilationGraph>(emptyGraph);

/** The point-scoped graph, when a location is set. Fetched on demand; null
 * means "no point, or not loaded yet". */
export const pointGraphAtom = atom<CompilationGraph | null>(null);

/** Which graph the list is showing: the point's if there is one, otherwise the
 * whole catalog. One row set, two provenances — so every filter, group header
 * and selection works identically in both. */
export const activeGraphAtom = atom<CompilationGraph>((get) => {
  const point = get(pointAtom);
  if (point == null) return get(graphAtom);
  return get(pointGraphAtom) ?? emptyGraph;
});

export const flatGraphAtom = atom((get) => flattenGraph(get(activeGraphAtom)));

export const nodesByIdAtom = atom<Map<number, GraphNode>>(
  (get) => get(flatGraphAtom).byId
);

export const rootsAtom = atom<GraphNode[]>((get) => get(flatGraphAtom).roots);

/** Members of each compilation, highest priority first — the member that wins
 * where they overlap. */
export const childrenAtom = atom<Map<number, GraphEdge[]>>((get) => {
  const byParent = new Map<number, GraphEdge[]>();
  for (const edge of get(activeGraphAtom).edges) {
    const list = byParent.get(edge.compilation_id) ?? [];
    list.push(edge);
    byParent.set(edge.compilation_id, list);
  }
  return byParent;
});

/* ---------------------------------------------------------------- filters */

/** Free text over slug, name and id. */
export const searchTextAtom = atom("");

/** Scale bands to keep. Empty means all of them. */
export const scaleFilterAtom = atom<string[]>([]);

function nodeMatches(
  node: GraphNode,
  query: string,
  scales: string[]
): boolean {
  if (scales.length > 0 && !scales.includes(node.scale ?? "")) return false;
  if (query === "") return true;
  return (
    node.slug.toLowerCase().includes(query) ||
    (node.name ?? "").toLowerCase().includes(query) ||
    String(node.source_id) === query
  );
}

/** Every node to draw: those matching, plus every ancestor of one. Null means
 * no filter is active.
 *
 * Filtering a tree on the node alone cuts the path to a match — search for a
 * state map and the compilation containing it disappears, taking the match with
 * it. Keeping ancestors is what makes a filtered tree still a tree. */
export const matchingIdsAtom = atom<Set<number> | null>((get) => {
  const query = get(searchTextAtom).trim().toLowerCase();
  const scales = get(scaleFilterAtom);
  if (query === "" && scales.length === 0) return null;

  const children = get(childrenAtom);

  const direct = new Set<number>();
  for (const node of get(activeGraphAtom).nodes) {
    if (nodeMatches(node, query, scales)) direct.add(node.source_id);
  }

  const keep = new Set<number>();
  const visiting = new Set<number>();

  function visit(id: number): boolean {
    if (keep.has(id)) return true;
    // The database forbids cycles, but a DAG still revisits shared nodes.
    if (visiting.has(id)) return false;
    visiting.add(id);

    let hit = direct.has(id);
    for (const edge of children.get(id) ?? []) {
      if (visit(edge.member_id)) hit = true;
    }
    visiting.delete(id);

    if (hit) keep.add(id);
    return hit;
  }

  for (const root of get(rootsAtom)) visit(root.source_id);

  // The walk starts at the compilation roots, so it never reaches a standalone
  // map. They have no ancestors to widen to, so a direct match is the whole
  // test.
  for (const node of get(activeGraphAtom).nodes) {
    if (node.is_standalone && direct.has(node.source_id)) {
      keep.add(node.source_id);
    }
  }

  return keep;
});

/** Ingested maps belonging to no compilation — the hierarchy's fallback bucket.
 *
 * Not a compilation and not a kind: just a state of the catalog, and one worth
 * seeing. The NGS quadrangle maps sit here until something wraps them, and a
 * superseded map often lands here permanently. */
export const standaloneNodesAtom = atom<GraphNode[]>((get) => {
  const keep = get(matchingIdsAtom);
  return get(activeGraphAtom)
    .nodes.filter((n) => n.is_standalone)
    .filter((n) => keep == null || keep.has(n.source_id))
    .sort((a, b) => a.slug.localeCompare(b.slug));
});

/** Slugs the map should draw, so map and tree agree. Null means draw
 * everything. */
export const visibleSlugsAtom = atom<string[] | null>((get) => {
  const keep = get(matchingIdsAtom);
  if (keep == null) return null;
  return get(activeGraphAtom)
    .nodes.filter((n) => keep.has(n.source_id))
    .map((n) => n.slug);
});

/* ---------------------------------------------------------------- the URL */

function searchParamAtom(key: string) {
  return atom(
    (get) => get(locationAtom).searchParams?.get(key) ?? null,
    (get, set, value: string | null) => {
      const loc = get(locationAtom);
      const searchParams = new URLSearchParams(loc.searchParams);
      if (value == null || value === "") {
        searchParams.delete(key);
      } else {
        searchParams.set(key, value);
      }
      set(locationAtom, { ...loc, searchParams });
    }
  );
}

/** The selected node: the root of the tree in the main panel, and what the map
 * draws. A slug, so the URL stays readable and the tile routes take it directly.
 *
 * One atom for both because they are one idea — "the thing I am looking at" —
 * and splitting them was what made the previous version confusing to read. */
export const focusSlugAtom = searchParamAtom("focus");

export const focusNodeAtom = atom<GraphNode | null>((get) => {
  const slug = get(focusSlugAtom);
  if (slug == null) return null;
  const nodes = get(activeGraphAtom).nodes;
  return nodes.find((n) => n.slug === slug) ?? null;
});

/** The route from a graph root down to the focused node, for the breadcrumb
 * back out. The graph is a DAG, so there can be several; the first one found by
 * breadth-first search is the shortest, which is the one worth showing. */
export const focusPathAtom = atom<GraphNode[]>((get) => {
  const target = get(focusNodeAtom);
  if (target == null) return [];

  const children = get(childrenAtom);
  const byId = get(nodesByIdAtom);
  const roots = get(rootsAtom);

  const queue: number[][] = roots.map((r) => [r.source_id]);
  const seen = new Set<number>(roots.map((r) => r.source_id));

  while (queue.length > 0) {
    const path = queue.shift()!;
    const id = path[path.length - 1];
    if (id === target.source_id) {
      return path.map((i) => byId.get(i)!).filter((n) => n != null);
    }
    for (const edge of children.get(id) ?? []) {
      if (seen.has(edge.member_id)) continue;
      seen.add(edge.member_id);
      queue.push([...path, edge.member_id]);
    }
  }

  return [target];
});

/** The inspected point. Written as one URL update rather than two, so a
 * half-updated location never reaches the query string. */
export const pointAtom = atom(
  (get): Point | null => {
    const params = get(locationAtom).searchParams;
    const lng = parseFloat(params?.get("lng"));
    const lat = parseFloat(params?.get("lat"));
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
    return { lng, lat };
  },
  (get, set, value: Point | null) => {
    const loc = get(locationAtom);
    const searchParams = new URLSearchParams(loc.searchParams);
    if (value == null) {
      searchParams.delete("lng");
      searchParams.delete("lat");
    } else {
      searchParams.set("lng", value.lng.toFixed(5));
      searchParams.set("lat", value.lat.toFixed(5));
    }
    set(locationAtom, { ...loc, searchParams });
  }
);

/* ------------------------------------------------------------ map options */

/** `maps` (member footprints) and `faces` (the solved dissolve) are the two
 * things the map is actually for here, so both are on by default. */
const footprintsParamAtom = searchParamAtom("footprints");
export const showFootprintsAtom = atom(
  (get) => get(footprintsParamAtom) !== "off",
  (get, set, value: boolean) => set(footprintsParamAtom, value ? null : "off")
);

const facesParamAtom = searchParamAtom("faces");
export const showFacesAtom = atom(
  (get) => get(facesParamAtom) !== "off",
  (get, set, value: boolean) => set(facesParamAtom, value ? null : "off")
);

/** Attribute to the maps a compilation *resolves to* rather than its direct
 * members — the tile routes' `expand`. Both are legitimate questions; the
 * default (units) is what the carto tiles are drawn at. */
const expandParamAtom = searchParamAtom("expand");
export const expandMembersAtom = atom(
  (get) => get(expandParamAtom) === "on",
  (get, set, value: boolean) => set(expandParamAtom, value ? "on" : null)
);

const cartoParamAtom = searchParamAtom("carto");
export const showCartoAtom = atom(
  (get) => get(cartoParamAtom) === "on",
  (get, set, value: boolean) => set(cartoParamAtom, value ? "on" : null)
);

const basemapParamAtom = searchParamAtom("basemap");
export const basemapAtom = atom(
  (get): Basemap => {
    const value = get(basemapParamAtom);
    if (value === Basemap.Satellite || value === Basemap.None) {
      return value as Basemap;
    }
    return Basemap.Basic;
  },
  (get, set, value: Basemap) => {
    set(basemapParamAtom, value === Basemap.Basic ? null : value);
  }
);

const labelsParamAtom = searchParamAtom("labels");
export const showLabelsAtom = atom(
  (get) => get(labelsParamAtom) !== "off",
  (get, set, value: boolean) => set(labelsParamAtom, value ? null : "off")
);
