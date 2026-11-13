import { atom } from "jotai";
import { atomWithSearchParam } from "~/_utils/url-atoms";
import type { Region, RegionSource } from "./api";

export interface Point {
  lng: number;
  lat: number;
}

/** What the list's filters ask of the map. Source and class are tile
 * properties; a text search becomes the ids it matched. */
export interface MapFilter {
  sourceID: number | null;
  regionClass: string | null;
  ids: number[] | null;
}

/** Seeded by `HybridPage`'s `initialAtoms` from `+data.ts`. */
export const allRegionsAtom = atom<Region[]>([]);

export const sourcesAtom = atom<RegionSource[]>([]);

const regionsByIDAtom = atom(
  (get) => new Map(get(allRegionsAtom).map((row) => [row.region_id, row]))
);

export const regionClassesAtom = atom((get) => {
  const classes = new Set<string>();
  for (const row of get(allRegionsAtom)) {
    if (row.region_class != null) classes.add(row.region_class);
  }
  return [...classes].sort();
});

/** Mirrored out of the data panel, which owns the filters. */
export const mapFilterAtom = atom<MapFilter | null>(null);

/** Where the map was clicked; the assistant describes the regions there. */
export const inspectedPointAtom = atom<Point | null>(null);

export const inspectedRegionIDsAtom = atom<number[]>([]);

const selectedParamAtom = atomWithSearchParam("region");

/** The region picked from the list, in `?region=`. */
export const selectedRegionIDAtom = atom(
  (get) => {
    const id = Number.parseInt(get(selectedParamAtom) ?? "");
    if (Number.isNaN(id)) return null;
    return id;
  },
  (get, set, id: number | null) => {
    set(selectedParamAtom, id?.toString() ?? null);
  }
);

export const selectedRegionAtom = atom((get) => {
  const id = get(selectedRegionIDAtom);
  if (id == null) return null;
  return get(regionsByIDAtom).get(id) ?? null;
});

// Rockd's order: the province first, then what overlies it
const classOrder = ["Physiographic", "Basin", "Glacial"];

function classRank(row: Region) {
  const rank = classOrder.indexOf(row.region_class ?? "");
  if (rank === -1) return classOrder.length;
  return rank;
}

/** The regions the assistant describes and the map outlines: the selected one,
 * or else those at the inspected point. */
export const focusedRegionsAtom = atom((get) => {
  const selected = get(selectedRegionAtom);
  if (selected != null) return [selected];
  if (get(inspectedPointAtom) == null) return [];
  const byID = get(regionsByIDAtom);
  return get(inspectedRegionIDsAtom)
    .map((id) => byID.get(id))
    .filter((row) => row != null)
    .sort((a, b) => classRank(a) - classRank(b));
});

export const assistantIdleAtom = atom(
  (get) => get(selectedRegionIDAtom) == null && get(inspectedPointAtom) == null
);
