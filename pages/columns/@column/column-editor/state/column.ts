/** The column being edited, and the transaction over it.
 *
 * The loaded column is **input data and stays that way**: `baseUnitsAtom` is
 * what came back from the API and is never written to. Every change lives in
 * `unitEditsAtom`, a map of unit id to the fields that differ — one
 * transaction, shared by every sheet and by the column graphic.
 *
 * Beside it, the column's *structure*: the units added in the page
 * (`addedUnitsAtom`, whole records under negative ids), the loaded units
 * removed (`deletedUnitIDsAtom`), and, once anything has been inserted, the
 * order the rows run in (`unitOrderAtom`). A new column is all structure —
 * nothing was loaded, so every unit is an added one.
 *
 * That is the whole of the editor's mutable state. The sheets don't own their
 * edits: each passes a slice of it as `DataSheet`'s overlay, which puts it
 * under our control, lights the edited cells green, and makes "revert" a
 * matter of emptying the transaction.
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

/** Units made in the page, as whole records. Their edits are written into
 * them directly: there is no loaded value to differ from. */
export const addedUnitsAtom = atom<Map<number, UnitLong>>(new Map());

/** Loaded units removed from the column. They stay in the sheets, struck
 * through, until the transaction is reset. */
export const deletedUnitIDsAtom = atom<Set<number>>(new Set());

/** The order the unit rows run in, top first, once a unit has been inserted
 * among the loaded ones; `null` keeps the order they were loaded in. */
export const unitOrderAtom = atom<number[] | null>(null);

export const isDirtyAtom = atom(
  (get) =>
    get(unitEditsAtom).size > 0 ||
    get(addedUnitsAtom).size > 0 ||
    get(deletedUnitIDsAtom).size > 0
);

/** Discard the transaction, structure and all. The sheets' overlays follow,
 * because they are derived from it rather than held inside the sheets. */
export const resetEditsAtom = atom(null, (get, set) => {
  if (!get(isDirtyAtom)) return;
  set(unitEditsAtom, new Map());
  set(addedUnitsAtom, new Map());
  set(deletedUnitIDsAtom, new Set());
  set(unitOrderAtom, null);
});

/** Every unit id in row order, removed ones included. */
export const unitIDsInOrderAtom = atom<number[]>((get) => {
  const order = get(unitOrderAtom);
  if (order != null) return order;
  const ids = get(baseUnitsAtom).map((u) => u.unit_id);
  return [...ids, ...get(addedUnitsAtom).keys()];
});

/** The rows the unit sheets hold, in order: each loaded unit as loaded (the
 * overlay carries its edits), each added unit as it now stands, and the
 * removed ones, which the overlay marks. */
export const sheetUnitsAtom = atom<UnitLong[]>((get) => {
  const base = new Map(get(baseUnitsAtom).map((u) => [u.unit_id, u]));
  const added = get(addedUnitsAtom);
  const rows: UnitLong[] = [];
  for (const id of get(unitIDsInOrderAtom)) {
    const unit = base.get(id) ?? added.get(id);
    if (unit != null) rows.push(unit);
  }
  return rows;
});

/** The units as edited: the column as it now stands, in row order. What the
 * column is drawn from, what is validated and what is exported. */
export const editedUnitsAtom = atom<UnitLong[]>((get) => {
  const edits = get(unitEditsAtom);
  const deleted = get(deletedUnitIDsAtom);
  const added = get(addedUnitsAtom);
  return get(sheetUnitsAtom)
    .filter((unit) => !deleted.has(unit.unit_id))
    .map((unit) => {
      if (added.has(unit.unit_id)) return unit;
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
    let added = get(addedUnitsAtom);

    for (const { unit_id, changes } of edits) {
      const addedUnit = added.get(unit_id);
      if (addedUnit != null) {
        if (added === get(addedUnitsAtom)) added = new Map(added);
        added.set(unit_id, { ...addedUnit, ...changes });
        continue;
      }
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
    set(addedUnitsAtom, added);
  }
);
