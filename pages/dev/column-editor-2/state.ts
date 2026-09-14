/** Editor state: one store of units, projected two ways.
 *
 * The units are the record; surfaces are derived from them (every distinct
 * unit top or bottom), annotated with the age model's boundaries where they
 * match. Editing a unit's age moves its surface; editing a surface's age moves
 * every unit hung on it. Nothing is written to the database — edits are local
 * until a v3 write route exists — so the page offers reset and export instead.
 */
import { atom } from "jotai";
import type { UnitLong } from "@macrostrat/api-types";
import { atomWithSearchParam } from "~/_utils/url-atoms";
import {
  AGE_TOLERANCE,
  type AgeModelBoundary,
  buildEditorSurfaces,
  type EditorSurface,
} from "./surfaces";

export interface ColumnSnapshot {
  col_id: number;
  columnInfo: any;
  units: UnitLong[];
  boundaries: AgeModelBoundary[];
}

/** The column as loaded: what reset returns to, and the source of the
 * age-model boundaries. Seeded through the frame's `initialAtoms`. */
export const snapshotAtom = atom<ColumnSnapshot | null>(null);

/** The working copy of the units */
export const unitsAtom = atom<UnitLong[]>([]);

/** Bumped on every edit; drives dirty state and sheet overlay resets */
export const editVersionAtom = atom(0);

export const isDirtyAtom = atom((get) => get(editVersionAtom) > 0);

export const surfacesAtom = atom<EditorSurface[]>((get) => {
  const units = get(unitsAtom);
  const boundaries = get(snapshotAtom)?.boundaries ?? [];
  return buildEditorSurfaces(units, boundaries);
});

/* ------------------------------------------------------------ editing mode */

export type EditingMode = "units" | "surfaces";

const modeParamAtom = atomWithSearchParam("mode");

/** Which table is being edited. Synced to `?mode=`, default kept out. */
export const editingModeAtom = atom(
  (get): EditingMode => {
    const raw = get(modeParamAtom);
    if (raw === "surfaces") return "surfaces";
    return "units";
  },
  (get, set, mode: EditingMode) => {
    let value: string | null = mode;
    if (mode === "units") value = null;
    set(modeParamAtom, value);
  }
);

/* --------------------------------------------------------------- selection */

export const selectedUnitIDAtom = atom<number | null>(null);
export const selectedSurfaceIDAtom = atom<string | null>(null);

export const selectedUnitAtom = atom<UnitLong | null>((get) => {
  const id = get(selectedUnitIDAtom);
  if (id == null) return null;
  return get(unitsAtom).find((u) => u.unit_id === id) ?? null;
});

export const selectedSurfaceAtom = atom<EditorSurface | null>((get) => {
  const id = get(selectedSurfaceIDAtom);
  if (id == null) return null;
  return get(surfacesAtom).find((s) => s.id === id) ?? null;
});

/* ------------------------------------------------------------------- edits */

export interface UnitPatch {
  unit_id: number;
  changes: Partial<UnitLong>;
}

/** Apply field changes to units, by id */
export const patchUnitsAtom = atom(null, (get, set, patches: UnitPatch[]) => {
  if (patches.length === 0) return;
  const byID = new Map<number, Partial<UnitLong>>();
  for (const { unit_id, changes } of patches) {
    byID.set(unit_id, { ...(byID.get(unit_id) ?? {}), ...changes });
  }
  const units = get(unitsAtom).map((unit) => {
    const changes = byID.get(unit.unit_id);
    if (changes == null) return unit;
    return { ...unit, ...changes };
  });
  set(unitsAtom, units);
  set(editVersionAtom, get(editVersionAtom) + 1);
});

/** Move a surface to a new age: every unit whose top sits on it gets the new
 * top age, every unit whose base sits on it the new base age. */
export const moveSurfaceAtom = atom(
  null,
  (get, set, { surfaceID, age }: { surfaceID: string; age: number }) => {
    const surface = get(surfacesAtom).find((s) => s.id === surfaceID);
    if (surface == null || isNaN(age)) return;
    if (Math.abs(surface.age - age) < AGE_TOLERANCE) return;
    const patches: UnitPatch[] = [];
    for (const unit_id of surface.unitsBelow) {
      patches.push({ unit_id, changes: { t_age: age } });
    }
    for (const unit_id of surface.unitsAbove) {
      patches.push({ unit_id, changes: { b_age: age } });
    }
    set(patchUnitsAtom, patches);
    // The surface's id is built from the units it separates, so it survives
    // the move; the selection holds.
  }
);

/** Discard every edit and return to the column as loaded */
export const resetEditsAtom = atom(null, (get, set) => {
  const snapshot = get(snapshotAtom);
  if (snapshot == null) return;
  set(unitsAtom, snapshot.units);
  set(editVersionAtom, 0);
});
