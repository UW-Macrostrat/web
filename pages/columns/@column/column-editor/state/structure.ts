/** Changing the column's structure: adding, splitting and removing units.
 *
 * Each action records the change in the transaction (`./column`) — a new unit
 * in `addedUnitsAtom`, a removed one in `deletedUnitIDsAtom`, the rows'
 * order in `unitOrderAtom` — so Reset undoes it like any edit, and selects
 * the unit it made, which scrolls the table to it. What the new units *are*
 * is in `../structure`.
 *
 * On a new column, whose surfaces are records, each action hands off to its
 * surface-first counterpart in `./draft`.
 */
import { atom, type Getter, type Setter } from "jotai";
import type { UnitLong } from "@macrostrat/api-types";
import {
  firstUnit,
  nextDraftID,
  splitUnit,
  unitNextTo,
  type InsertPlace,
  type IntervalMap,
  type StructureOptions,
} from "../structure";
import {
  addedUnitsAtom,
  applyUnitEditsAtom,
  baseUnitsAtom,
  deletedUnitIDsAtom,
  editedUnitsAtom,
  isDraftColumnAtom,
  unitIDsInOrderAtom,
  unitOrderAtom,
} from "./column";
import { draftInsertUnitAtom, draftSplitUnitAtom } from "./draft";
import { positionAxisAtom } from "./options";
import { selectedUnitIDAtom } from "./view";

/** A unit above or below `unit_id`; with no reference, at the top of the
 * column, or the column's first unit when it has none. */
export const insertUnitAtom = atom(
  null,
  (
    get,
    set,
    {
      unit_id,
      place,
      intervals,
    }: { unit_id: number | null; place: InsertPlace; intervals: IntervalMap }
  ) => {
    if (get(isDraftColumnAtom)) {
      set(draftInsertUnitAtom, { unit_id, place });
      return;
    }
    const opts = structureOptions(get, intervals);
    const units = get(editedUnitsAtom);
    const id = nextDraftID(allIDs(get));

    let reference = units.find((u) => u.unit_id === unit_id) ?? null;
    // Nothing chosen: the top of the column
    if (reference == null && unit_id == null) {
      reference = units[0] ?? null;
      place = "above";
    }

    let unit: UnitLong;
    if (reference == null) {
      unit = firstUnit(id, opts);
    } else {
      unit = unitNextTo(reference, place, id, opts);
    }

    let at = 0;
    if (reference != null) {
      at = get(unitIDsInOrderAtom).indexOf(reference.unit_id);
      if (place === "below") at += 1;
    }
    addUnit(get, set, unit, at);
  }
);

/** A new surface through a unit: the unit keeps its base, and a copy of it
 * above the surface takes its top. */
export const splitUnitAtom = atom(
  null,
  (
    get,
    set,
    { unit_id, intervals }: { unit_id: number; intervals: IntervalMap }
  ) => {
    if (get(isDraftColumnAtom)) {
      set(draftSplitUnitAtom, unit_id);
      return;
    }
    const unit = get(editedUnitsAtom).find((u) => u.unit_id === unit_id);
    if (unit == null) return;
    const id = nextDraftID(allIDs(get));
    const split = splitUnit(unit, id, structureOptions(get, intervals));
    if (split == null) return;

    set(applyUnitEditsAtom, [{ unit_id, changes: split.lower }]);
    // Rows run top first, so the upper half goes before the unit
    const at = get(unitIDsInOrderAtom).indexOf(unit_id);
    addUnit(get, set, split.upper, at);
  }
);

/** Remove units. A loaded unit is marked removed, and stays in the sheets
 * until the transaction is reset; one made in the page is simply gone. */
export const deleteUnitsAtom = atom(null, (get, set, unit_ids: number[]) => {
  const added = new Map(get(addedUnitsAtom));
  const deleted = new Set(get(deletedUnitIDsAtom));
  const base = new Set(get(baseUnitsAtom).map((u) => u.unit_id));
  const dropped = new Set<number>();
  for (const id of unit_ids) {
    if (added.delete(id)) {
      dropped.add(id);
    } else if (base.has(id)) {
      deleted.add(id);
    }
  }
  set(addedUnitsAtom, added);
  set(deletedUnitIDsAtom, deleted);
  const order = get(unitOrderAtom);
  if (order != null && dropped.size > 0) {
    set(
      unitOrderAtom,
      order.filter((id) => !dropped.has(id))
    );
  }
  if (unit_ids.includes(get(selectedUnitIDAtom) as number)) {
    set(selectedUnitIDAtom, null);
  }
});

/** Put a new unit into the column at row `at`, and select it. */
function addUnit(get: Getter, set: Setter, unit: UnitLong, at: number) {
  const added = new Map(get(addedUnitsAtom));
  added.set(unit.unit_id, unit);
  const order = [...get(unitIDsInOrderAtom)];
  order.splice(Math.max(at, 0), 0, unit.unit_id);
  set(addedUnitsAtom, added);
  set(unitOrderAtom, order);
  set(selectedUnitIDAtom, unit.unit_id);
}

function allIDs(get: Getter): number[] {
  return [
    ...get(baseUnitsAtom).map((u) => u.unit_id),
    ...get(addedUnitsAtom).keys(),
  ];
}

function structureOptions(get: Getter, intervals: IntervalMap): StructureOptions {
  return { positionAxis: get(positionAxisAtom), intervals };
}
