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
import { buildEditorSurfaces, type EditorSurface } from "../surfaces";
import { unitBoundary } from "../boundaries";
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
  )
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
    );
  }
  return buildEditorSurfaces(
    get(drawableUnitsAtom),
    get(boundariesAtom),
    get(surfaceAxisTypeAtom)
  );
});

/** Fields of the surfaces sheet that an edit can change. */
const SURFACE_EDITABLE_FIELDS = ["age", "position", "proportion"] as const;

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
