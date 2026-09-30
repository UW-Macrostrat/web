/** Page state for map provenance: which map replaces which, and who is credited.
 *
 * The list is the compilation graph's nodes (every ingested map, with
 * `superseded_by` on each), seeded from `+data.ts`. The selected map's detail —
 * its citation, parents, bounds and what it supersedes — and the maps covering
 * the same ground come from api-v3 per selection.
 */

import { apiV3Prefix } from "@macrostrat-web/settings";
import { atom } from "jotai";
import { loadable } from "jotai/utils";

import {
  emptyGraph,
  type CompilationGraph,
  type GraphNode,
} from "~/components/compilation-tree";
import { atomWithSearchParam } from "~/_utils/url-atoms";

/* ------------------------------------------------------------- the graph */

/** Seeded by `HybridPage`'s `initialAtoms`, replaced after a save. */
export const graphAtom = atom<CompilationGraph>(emptyGraph);

/** Bumped after a save, so the selection's detail is fetched again. */
export const versionAtom = atom(0);

export const nodesByIdAtom = atom(
  (get) => new Map(get(graphAtom).nodes.map((n) => [n.source_id, n]))
);

/** Maps each map supersedes, by superseder. */
export const supersededByIdAtom = atom((get) => {
  const byId = new Map<number, GraphNode[]>();
  for (const node of get(graphAtom).nodes) {
    if (node.superseded_by == null) continue;
    const list = byId.get(node.superseded_by) ?? [];
    list.push(node);
    byId.set(node.superseded_by, list);
  }
  return byId;
});

/* -------------------------------------------------------------- the list */

export type ListFilter = "all" | "superseded" | "superseding";

export const listFilterAtom = atom<ListFilter>("all");
export const searchTextAtom = atom("");

export const listedNodesAtom = atom((get) => {
  const filter = get(listFilterAtom);
  const query = get(searchTextAtom).trim().toLowerCase();
  const superseding = get(supersededByIdAtom);

  return get(graphAtom)
    .nodes.filter((n) => {
      if (filter === "superseded") return n.superseded_by != null;
      if (filter === "superseding") return superseding.has(n.source_id);
      return true;
    })
    .filter((n) => {
      if (query === "") return true;
      return (
        n.slug.toLowerCase().includes(query) ||
        (n.name ?? "").toLowerCase().includes(query) ||
        String(n.source_id) === query
      );
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));
});

/* ------------------------------------------------------------ selection */

export const selectedSlugAtom = atomWithSearchParam("map");

export const selectedNodeAtom = atom((get) => {
  const slug = get(selectedSlugAtom);
  if (slug == null) return null;
  return get(graphAtom).nodes.find((n) => n.slug === slug) ?? null;
});

/** An overlapping map being looked at beside the selection. Transient. */
export const compareSlugAtom = atom<string | null>(null);

export interface SourceRef {
  source_id: number;
  slug: string;
  name: string | null;
}

export interface ParentRef extends SourceRef {
  priority: number | null;
}

/** The fields of api-v3's `/compilations/{ident}` this page reads. */
export interface SourceDetail {
  source_id: number;
  slug: string;
  name: string | null;
  scale: string | null;
  ref_title: string | null;
  authors: string | null;
  ref_year: string | null;
  url: string | null;
  is_compilation: boolean;
  is_mosaic_member: boolean;
  superseded_by: number | null;
  superseded_by_slug: string | null;
  supersedes: SourceRef[];
  bounds: [number, number, number, number] | null;
  parents: ParentRef[];
}

export interface Neighbor {
  source_id: number;
  slug: string;
  name: string | null;
  scale: string | null;
  overlap_fraction: number | null;
  scale_distance: number;
  superseded_by: number | null;
  in_compilations: string[];
}

async function getJSON(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
  return await res.json();
}

const detailQueryAtom = atom(async (get): Promise<SourceDetail | null> => {
  const slug = get(selectedSlugAtom);
  get(versionAtom);
  if (slug == null) return null;
  return await getJSON(`${apiV3Prefix}/compilations/${slug}`);
});

export const detailAtom = loadable(detailQueryAtom);

/** Maps covering the same ground at this scale or finer, for comparison. */
const neighborsQueryAtom = atom(async (get): Promise<Neighbor[]> => {
  const slug = get(selectedSlugAtom);
  get(versionAtom);
  if (slug == null) return [];
  const res = await getJSON(`${apiV3Prefix}/compilations/${slug}/neighbors`);
  return res.neighbors ?? [];
});

export const neighborsAtom = loadable(neighborsQueryAtom);

/* ---------------------------------------------------------------- editing */

/** Unsaved changes to the selected map. `superseded_by` undefined means
 * unchanged, null means cleared. `withdraw` lists compilations to remove the map
 * from — supersession itself deletes nothing. */
export interface ProvenanceDraft {
  source_id: number;
  superseded_by?: number | null;
  withdraw: number[];
}

const draftStoreAtom = atom<ProvenanceDraft | null>(null);

/** The draft for the current selection; a draft left on another map is
 * discarded rather than carried over. */
export const draftAtom = atom(
  (get): ProvenanceDraft | null => {
    const draft = get(draftStoreAtom);
    const node = get(selectedNodeAtom);
    if (draft == null || node == null) return null;
    if (draft.source_id !== node.source_id) return null;
    return draft;
  },
  (get, set, value: ProvenanceDraft | null) => set(draftStoreAtom, value)
);

/** The map's superseder as the draft has it. */
export const effectiveSupersederAtom = atom((get): number | null => {
  const node = get(selectedNodeAtom);
  if (node == null) return null;
  const draft = get(draftAtom);
  if (draft?.superseded_by !== undefined) return draft.superseded_by;
  return node.superseded_by;
});

export const hasChangesAtom = atom((get) => {
  const draft = get(draftAtom);
  const node = get(selectedNodeAtom);
  if (draft == null || node == null) return false;
  const supersessionChanged =
    draft.superseded_by !== undefined &&
    draft.superseded_by !== node.superseded_by;
  return supersessionChanged || draft.withdraw.length > 0;
});

/** Set when a save removed memberships: nothing downstream has been rebuilt. */
export const needsTopoUpdateAtom = atom(false);
