import { atom } from "jotai";
import type { CompilationOption, MapRow } from "./compilations";

export interface Point {
  lng: number;
  lat: number;
}

/** Seeded by `HybridPage`'s `initialAtoms` from `+data.ts`. */
export const allMapsAtom = atom<MapRow[]>([]);

export const compilationsAtom = atom<CompilationOption[]>([]);

/** The list's filtered set, mirrored out of the data panel for the map. */
export const visibleMapsAtom = atom<MapRow[] | null>(null);

/** Where the map was clicked; the assistant lists the maps covering it. */
export const inspectedPointAtom = atom<Point | null>(null);

/** Source ids of the footprints at the inspected point. */
export const inspectedMapIDsAtom = atom<number[]>([]);

export const inspectedMapsAtom = atom((get) => {
  const ids = get(inspectedMapIDsAtom);
  const byID = new Map(get(allMapsAtom).map((row) => [row.source_id, row]));
  return ids.map((id) => byID.get(id)).filter((row) => row != null);
});

export const assistantIdleAtom = atom(
  (get) => get(inspectedPointAtom) == null
);
