/** Surfaces as the editor sees them: a projection of the units, not a record.
 *
 * Two projections, because the surfaces sheet is a *view* of the transaction
 * and has to show it the way the unit sheets do. `baseSurfacesAtom` is the
 * column as loaded and `surfacesAtom` the column as edited; the difference
 * between them is the sheet's `updatedData`, which is what marks a surface row
 * as changed.
 */
import { atom } from "jotai";
import type { UnitLong } from "@macrostrat/api-types";
import {
  buildEditorSurfaces,
  type EditorSurface,
  withCalibrationName,
} from "../surfaces";
import { unitBoundary, type IntervalDef } from "../boundaries";
import { intervalDefsAtom } from "./intervals";
import {
  draftEditorSurfaces,
  placeDraftUnit,
  workingCoordinates,
  type DraftUnit,
} from "../draft-surfaces";
import {
  baseUnitsAtom,
  boundariesAtom,
  draftSurfaceOrderAtom,
  draftSurfacesAtom,
  editedUnitsAtom,
  isDraftColumnAtom,
  isDraftUnit,
} from "./column";
import {
  boundaryKindAtom,
  positionAxisAtom,
  surfaceAxisTypeAtom,
} from "./options";

/** Where each of a new column's surfaces sits: its constraint, or a guess
 * between the constrained ones (see `../draft-surfaces`). */
export const workingCoordinatesAtom = atom((get) =>
  workingCoordinates(
    get(draftSurfaceOrderAtom),
    get(draftSurfacesAtom),
    get(positionAxisAtom)
  )
);

/** Whether a new column has nothing to place it yet: drawn by surface order
 * alone, with no ages for a timescale to measure. */
export const isSpeculativeColumnAtom = atom((get) => {
  if (!get(isDraftColumnAtom)) return false;
  for (const coord of get(workingCoordinatesAtom).values()) {
    if (coord.anchored) return false;
  }
  return true;
});

/** The edited units that can be placed on the index in force. A new column's
 * units are placed on their surfaces' working coordinates, so each one has
 * somewhere to be from the start. A loaded column's need both boundaries: a
 * unit just added to one has no ages until its intervals are entered, and is
 * in the sheets, flagged, but not drawn. */
export const drawableUnitsAtom = atom<UnitLong[]>((get) => {
  const units = get(editedUnitsAtom);
  if (get(isDraftColumnAtom)) {
    const coords = get(workingCoordinatesAtom);
    const axis = get(positionAxisAtom);
    return units
      .map((unit) => {
        if (!isDraftUnit(unit)) return unit;
        return placeDraftUnit(unit, coords, axis);
      })
      .filter((unit): unit is UnitLong => unit != null);
  }
  const kind = get(boundaryKindAtom);
  return units.filter(
    (unit) =>
      unitBoundary(unit, "top", kind) != null &&
      unitBoundary(unit, "bottom", kind) != null
  );
});

/** The surfaces of the column as loaded. */
export const baseSurfacesAtom = atom<EditorSurface[]>((get) =>
  buildEditorSurfaces(
    get(baseUnitsAtom),
    get(boundariesAtom),
    get(surfaceAxisTypeAtom)
  ).map(withCalibrationName)
);

/** The surfaces of the column as edited — the rows the sheet shows and the
 * lines the column draws. A loaded column's are re-projected rather than
 * patched, so a surface that an edit split or merged is simply gone or new; a
 * new column's are its records, placed at their working coordinates. */
export const surfacesAtom = atom<EditorSurface[]>((get) => {
  if (get(isDraftColumnAtom)) {
    return draftEditorSurfaces(
      get(draftSurfaceOrderAtom),
      get(draftSurfacesAtom),
      get(editedUnitsAtom) as DraftUnit[],
      get(workingCoordinatesAtom),
      get(positionAxisAtom)
    ).map(withCalibrationName);
  }
  return recalibrated(
    buildEditorSurfaces(
      get(drawableUnitsAtom),
      get(boundariesAtom),
      get(surfaceAxisTypeAtom)
    ),
    get(editedUnitsAtom),
    get(baseUnitsAtom),
    get(intervalDefsAtom)
  ).map(withCalibrationName);
});

/** A loaded surface's calibration is the age model's, matched to it — until
 * an edit gives the units resting on it another interval, which is then what
 * the surface is calibrated to. Only an edited interval overrides: where the
 * units' own intervals merely differ from the age model's as loaded, the age
 * model is the record. Its contact, likewise, is the age model's until the
 * units above are given a `basal_surface`. */
function recalibrated(
  surfaces: EditorSurface[],
  units: UnitLong[],
  base: UnitLong[],
  intervals: Map<number, IntervalDef> | null
): EditorSurface[] {
  const edited = new Map(units.map((u) => [u.unit_id, u]));
  const loaded = new Map(base.map((u) => [u.unit_id, u]));
  return surfaces.map((input) => {
    let surface = input;
    const contact = surface.unitsAbove
      .map((id) => (edited.get(id) as any)?.basal_surface)
      .find((d) => d != null);
    if (contact != null) surface = { ...surface, type: contact };
    // A unit above rests on the surface with its base, one below with its top
    const sides: [number, "b" | "t"][] = [
      ...surface.unitsAbove.map((id): [number, "b"] => [id, "b"]),
      ...surface.unitsBelow.map((id): [number, "t"] => [id, "t"]),
    ];
    for (const [id, p] of sides) {
      const unit = edited.get(id);
      const before = loaded.get(id);
      const int_id = unit?.[`${p}_int_id`];
      if (int_id == null || int_id === before?.[`${p}_int_id`]) continue;
      const def = intervals?.get(int_id);
      if (def == null) continue;
      return {
        ...surface,
        calibration: {
          id: def.int_id,
          name: def.name,
          b_age: def.b_age,
          t_age: def.t_age,
        } as EditorSurface["calibration"],
        proportion: unit?.[`${p}_prop`] ?? surface.proportion,
      };
    }
    return surface;
  });
}

/** Fields of the surfaces sheet that an edit can change. */
const SURFACE_EDITABLE_FIELDS = [
  "age",
  "position",
  "proportion",
  "calibration_name",
] as const;

/** The loaded surfaces by id, for diffing the edited ones against. */
export const baseSurfaceIndexAtom = atom(
  (get) => new Map(get(baseSurfacesAtom).map((s) => [s.id, s]))
);

/** The transaction seen from the surfaces sheet: for each row the sheet is
 * holding, the fields that differ from the same surface in the column as
 * loaded. Built against the rows in hand rather than the whole projection,
 * for the reason `unitOverlayFor` gives. A surface with no counterpart in the
 * loaded column — one an edit created — is marked whole. */
export function surfaceOverlayFor(
  base: Map<string, EditorSurface>,
  rows: (EditorSurface | null | undefined)[]
): (Partial<EditorSurface> | undefined)[] {
  return rows.map((surface) => {
    if (surface == null) return undefined;
    const original = base.get(surface.id);
    if (original == null) {
      return { age: surface.age, position: surface.position };
    }
    const changed: Partial<EditorSurface> = {};
    for (const field of SURFACE_EDITABLE_FIELDS) {
      if (surface[field] === original[field]) continue;
      (changed as any)[field] = surface[field];
    }
    if (Object.keys(changed).length === 0) return undefined;
    return changed;
  });
}
