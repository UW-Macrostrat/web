/** Surfaces as the editor sees them: a projection of the units, not a record.
 *
 * Two projections, because the surfaces sheet is a *view* of the transaction
 * and has to show it the way the unit sheets do. `baseSurfacesAtom` is the
 * column as loaded and `surfacesAtom` the column as edited; the difference
 * between them is the sheet's `updatedData`, which is what marks a surface row
 * as changed.
 */
import { atom } from "jotai";
import { buildEditorSurfaces, type EditorSurface } from "../surfaces";
import { baseUnitsAtom, boundariesAtom, editedUnitsAtom } from "./column";
import { surfaceAxisTypeAtom } from "./options";

/** The surfaces of the column as loaded. */
export const baseSurfacesAtom = atom<EditorSurface[]>((get) =>
  buildEditorSurfaces(
    get(baseUnitsAtom),
    get(boundariesAtom),
    get(surfaceAxisTypeAtom)
  )
);

/** The surfaces of the column as edited — the rows the sheet shows and the
 * lines the column draws. Re-projected rather than patched, so a surface that
 * an edit split or merged is simply gone or new. */
export const surfacesAtom = atom<EditorSurface[]>((get) =>
  buildEditorSurfaces(
    get(editedUnitsAtom),
    get(boundariesAtom),
    get(surfaceAxisTypeAtom)
  )
);

/** Fields of the surfaces sheet that an edit can change. */
const SURFACE_EDITABLE_FIELDS = ["age", "position", "proportion"] as const;

/** The transaction seen from the surfaces sheet: for each row, the fields
 * that differ from the same surface in the column as loaded. The rows are the
 * *edited* surfaces, so this only ever marks cells — it never has to invent or
 * drop a row. A surface with no counterpart in the loaded column (one an edit
 * created) is marked whole. */
export const surfaceOverlayAtom = atom<(Partial<EditorSurface> | undefined)[]>(
  (get) => {
    const base = new Map(get(baseSurfacesAtom).map((s) => [s.id, s]));
    return get(surfacesAtom).map((surface) => {
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
);
