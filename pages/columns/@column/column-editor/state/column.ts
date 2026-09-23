/** The column being edited, and the transaction over it.
 *
 * The loaded column is **input data and stays that way**: `baseUnitsAtom` is
 * what came back from the API and is never written to. Every change lives in
 * `unitEditsAtom`, a map of unit id to the fields that differ — one
 * transaction, shared by every sheet and by the column graphic.
 *
 * That map is the whole of the editor's mutable state. The sheets don't own
 * their edits: each passes a slice of it as `DataSheet`'s `updatedData`, which
 * puts the sheet's overlay under our control, lights the edited cells green,
 * and makes "revert" a matter of emptying one map.
 */
import { atom } from "jotai";
import type { AgeModelBoundary, UnitLong } from "@macrostrat/api-types";
import { sameFieldValue } from "../validation";

export interface ColumnSnapshot {
  /** `null` for a draft column that has never been written */
  col_id: number | null;
  columnInfo: any;
  units: UnitLong[];
  boundaries: AgeModelBoundary[];
  isDraft?: boolean;
}

/** The column as loaded. Seeded through the frame's `initialAtoms`. */
export const snapshotAtom = atom<ColumnSnapshot | null>(null);

/** The units as loaded — the input data, never edited in place. */
export const baseUnitsAtom = atom<UnitLong[]>(
  (get) => get(snapshotAtom)?.units ?? []
);

export const boundariesAtom = atom<AgeModelBoundary[]>(
  (get) => get(snapshotAtom)?.boundaries ?? []
);

/** A pending change to one unit: only the fields that differ from the loaded
 * row, so the map is exactly the transaction and nothing more. */
export type UnitEdit = Partial<UnitLong>;

export const unitEditsAtom = atom<Map<number, UnitEdit>>(new Map());

export const isDirtyAtom = atom((get) => get(unitEditsAtom).size > 0);

/** Discard the transaction. The sheets' overlays follow, because they are
 * derived from it rather than held inside the sheets. */
export const resetEditsAtom = atom(null, (get, set) => {
  if (get(unitEditsAtom).size === 0) return;
  set(unitEditsAtom, new Map());
});

/** The units as edited: the input rows with the transaction laid over them.
 * What the sheets show, and what the column is drawn from. */
export const editedUnitsAtom = atom<UnitLong[]>((get) => {
  const edits = get(unitEditsAtom);
  const units = get(baseUnitsAtom);
  if (edits.size === 0) return units;
  return units.map((unit) => {
    const edit = edits.get(unit.unit_id);
    if (edit == null) return unit;
    return { ...unit, ...edit };
  });
});

/** The transaction as `DataSheet`'s overlay, aligned to the rows the sheet is
 * *currently holding*.
 *
 * Not to `baseUnitsAtom`: a local data provider applies the active filters
 * itself and hands back only the matching rows, leaving the store's `data`
 * shorter than the column as loaded. An overlay built against the full set
 * would then be both too long — the table draws `max(data, updatedData)` rows,
 * so the surplus appear as empty ones — and misaligned, attaching each edit to
 * whichever row now sits at its old index. Keying on the row in hand avoids
 * both. */
export function unitOverlayFor(
  edits: Map<number, UnitEdit>,
  rows: (UnitLong | null | undefined)[]
): (UnitEdit | undefined)[] {
  return rows.map((unit) =>
    unit == null ? undefined : edits.get(unit.unit_id)
  );
}

/* -------------------------------------------------------------- writing */

export interface UnitFieldEdit {
  unit_id: number;
  changes: Partial<UnitLong>;
}

/** Record field changes against the loaded column.
 *
 * A field typed back to its loaded value leaves the transaction rather than
 * sitting in it as a no-op change — so the green cells are the real diff, and
 * undoing every edit by hand leaves the editor clean.
 */
export const applyUnitEditsAtom = atom(
  null,
  (get, set, edits: UnitFieldEdit[]) => {
    if (edits.length === 0) return;
    const base = new Map(get(baseUnitsAtom).map((u) => [u.unit_id, u]));
    const next = new Map(get(unitEditsAtom));

    for (const { unit_id, changes } of edits) {
      const baseUnit = base.get(unit_id);
      if (baseUnit == null) continue;
      const merged: UnitEdit = { ...(next.get(unit_id) ?? {}), ...changes };
      for (const key of Object.keys(merged)) {
        if (sameFieldValue(merged[key], baseUnit[key])) delete merged[key];
      }
      if (Object.keys(merged).length === 0) {
        next.delete(unit_id);
      } else {
        next.set(unit_id, merged);
      }
    }

    set(unitEditsAtom, next);
  }
);
