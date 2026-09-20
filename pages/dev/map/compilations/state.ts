/** Page state for the compilation browser.
 *
 * The graph itself is seeded from `+data.ts` and never refetched; everything
 * here is derived from it or is view state. What's worth sharing goes in the
 * query string — the focused compilation, the inspected point, the map settings
 * — while transient UI state stays in memory.
 *
 * The tree's own derived state (children, roots, filtering, the route to the
 * selection) lives in `~/components/compilation-tree`, shared with the topology
 * page: this file supplies the two atoms that differ between them.
 */

import { atom } from "jotai";
import {
  compilationTreeAtoms,
  emptyGraph,
  type CompilationGraph,
} from "~/components/compilation-tree";
import { locationAtom } from "~/_utils/url-atoms";
import { Basemap } from "~/components";

export interface Point {
  lng: number;
  lat: number;
}

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

/* ------------------------------------------------------------- the graph */

/** Seeded by `HybridPage`'s `initialAtoms` from the server-side fetch. */
export const graphAtom = atom<CompilationGraph>(emptyGraph);

/** The point-scoped graph, when a location is set. Fetched on demand; null
 * means "no point, or not loaded yet". */
export const pointGraphAtom = atom<CompilationGraph | null>(null);

/** Which graph the tree is showing: the point's if there is one, otherwise the
 * whole catalog. One node set, two provenances — so every filter and selection
 * works identically in both. */
export const activeGraphAtom = atom<CompilationGraph>((get) => {
  const point = get(pointAtom);
  if (point == null) return get(graphAtom);
  return get(pointGraphAtom) ?? emptyGraph;
});

/** The selected node: what the map draws and the assistant describes. A slug, so
 * the URL stays readable and the tile routes take it directly. */
export const focusSlugAtom = searchParamAtom("focus");

export const treeAtoms = compilationTreeAtoms({
  graph: activeGraphAtom,
  focusSlug: focusSlugAtom,
});

export const focusNodeAtom = treeAtoms.focusNode;

/** Slugs the map should draw, so map and tree agree. Null means draw
 * everything. */
export const visibleSlugsAtom = treeAtoms.visibleSlugs;

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
