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
import { ColumnAxisType } from "@macrostrat/column-components";
import type { UnitLong } from "@macrostrat/api-types";
import {
  extensionUnit,
  firstUnit,
  nextDraftID,
  splitUnit,
  splitUnitAt,
  unitContains,
  unitExtent,
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
import {
  draftAddSurfaceAtAtom,
  draftInsertUnitAtom,
  draftSplitUnitAtom,
} from "./draft";
import { boundaryKindAtom, positionAxisAtom } from "./options";
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

/** A new surface at `coord` — a position on a measured column, an age
 * otherwise — as a click on the column puts one: through every unit it falls
 * in, each split there, or past the column's end, reached by an empty unit
 * from the column's last boundary. A coordinate in a gap between units adds
 * nothing. */
export const addSurfaceAtAtom = atom(
  null,
  (
    get,
    set,
    { coord, intervals }: { coord: number; intervals: IntervalMap }
  ) => {
    if (get(isDraftColumnAtom)) {
      set(draftAddSurfaceAtAtom, { coord });
      return;
    }
    const kind = get(boundaryKindAtom);
    const opts = structureOptions(get, intervals);
    const units = get(editedUnitsAtom);

    const containing = units.filter((u) => unitContains(u, coord, kind));
    if (containing.length > 0) {
      for (const unit of containing) {
        const id = nextDraftID(allIDs(get));
        const split = splitUnitAt(unit, coord, kind, id, opts);
        if (split == null) continue;
        set(applyUnitEditsAtom, [{ unit_id: unit.unit_id, changes: split.lower }]);
        const at = get(unitIDsInOrderAtom).indexOf(unit.unit_id);
        addUnit(get, set, split.upper, at);
      }
      return;
    }

    // Past the column's end: an empty unit out to it, from the unit whose
    // boundary is outermost on that side
    const extreme = outermostUnit(units, coord, kind, opts.positionAxis);
    if (extreme == null) return;
    const id = nextDraftID(allIDs(get));
    const unit = extensionUnit(extreme.unit, extreme.place, coord, kind, id, opts);
    let at = 0;
    if (extreme.place === "below") at = get(unitIDsInOrderAtom).length;
    addUnit(get, set, unit, at);
  }
);

/** The unit a coordinate past the column's end extends from — the one with
 * the topmost top, or the lowest base — and on which side; `null` when the
 * coordinate is within the column. Tops are youngest on an age column, and
 * highest (or shallowest) on a measured one. */
function outermostUnit(
  units: UnitLong[],
  coord: number,
  kind: "position" | "chrono",
  positionAxis: StructureOptions["positionAxis"]
): { unit: UnitLong; place: InsertPlace } | null {
  // A coordinate that grows downwards: age, depth, or negated height
  let sign = 1;
  if (kind === "position" && positionAxis === ColumnAxisType.HEIGHT) sign = -1;
  let top: { unit: UnitLong; v: number } | null = null;
  let bottom: { unit: UnitLong; v: number } | null = null;
  for (const unit of units) {
    const [t, b] = unitExtent(unit, kind);
    if (t != null && (top == null || t * sign < top.v)) top = { unit, v: t * sign };
    if (b != null && (bottom == null || b * sign > bottom.v)) bottom = { unit, v: b * sign };
  }
  const c = coord * sign;
  if (top != null && c < top.v) return { unit: top.unit, place: "above" };
  if (bottom != null && c > bottom.v) return { unit: bottom.unit, place: "below" };
  return null;
}

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
