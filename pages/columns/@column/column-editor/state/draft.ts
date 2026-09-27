/** Building a new column surface-first.
 *
 * A new column keeps its surfaces as records (`../draft-surfaces`), so every
 * structural edit is a statement about surfaces, and no unit ever lacks
 * somewhere to be drawn:
 *
 * - **A unit** comes with its surfaces: the first one with two new ones; one
 *   above or below another between that unit's boundary and a new surface
 *   inserted next to it, which pushes whatever rested on that boundary along;
 * - **Split** inserts a surface inside a unit, which the unit and a copy of it
 *   then share;
 * - **A surface** can be added on its own, above or below another — or at a
 *   height clicked on the column, splitting the units it falls in, or past
 *   either end, reached by an *empty* unit — and **Fill units** puts a unit in
 *   every gap between adjacent surfaces that no unit spans;
 * - **Constraining** a surface gives it a position, or an interval and a
 *   proportion; every unit resting on it follows.
 *
 * A loaded column's structure edits are in `./structure`, which hands a new
 * column's to these.
 */
import { atom, type Getter, type Setter } from "jotai";
import type { UnitLong } from "@macrostrat/api-types";
import {
  blankSurface,
  nextSurfaceID,
  unfilledGaps,
  type DraftSurface,
  type DraftUnit,
} from "../draft-surfaces";
import { blankUnit, nextDraftID, type InsertPlace } from "../structure";
import type { BoundarySide, BoundaryValues, IntervalDef } from "../boundaries";
import {
  addedUnitsAtom,
  draftSurfaceOrderAtom,
  draftSurfacesAtom,
} from "./column";
import { positionAxisAtom } from "./options";
import { workingCoordinatesAtom } from "./surfaces";
import { selectedSurfaceIDAtom, selectedUnitIDAtom } from "./view";
import { ColumnAxisType } from "@macrostrat/column-components";

/** A unit above or below `unit_id`; with no reference, at the top of the
 * column, or the column's first unit when it has none. */
export const draftInsertUnitAtom = atom(
  null,
  (
    get,
    set,
    { unit_id, place }: { unit_id: number | null; place: InsertPlace }
  ) => {
    const units = draftUnits(get);
    const order = get(draftSurfaceOrderAtom);
    const reference = units.find((u) => u.unit_id === unit_id) ?? null;

    // The column's first unit, and its two surfaces
    if (order.length === 0) {
      const top = createSurface(get, set, 0);
      const bottom = createSurface(get, set, 1);
      addDraftUnit(get, set, { t_surface: top, b_surface: bottom });
      return;
    }

    // Nothing chosen: on top of the column
    if (reference == null) {
      const top = createSurface(get, set, 0);
      addDraftUnit(get, set, { t_surface: top, b_surface: order[0] });
      return;
    }

    // Against the reference's boundary, pushing what rested there along
    if (place === "above") {
      const boundary = reference.t_surface as string;
      const surface = createSurface(get, set, order.indexOf(boundary));
      moveEnds(get, set, "b_surface", boundary, surface, reference.unit_id);
      addDraftUnit(get, set, { t_surface: surface, b_surface: boundary });
      return;
    }
    const boundary = reference.b_surface as string;
    const surface = createSurface(get, set, order.indexOf(boundary) + 1);
    moveEnds(get, set, "t_surface", boundary, surface, reference.unit_id);
    addDraftUnit(get, set, { t_surface: boundary, b_surface: surface });
  }
);

/** A new surface inside a unit: the unit keeps its base and ends at the
 * surface; a copy of it runs from the surface to the old top. */
export const draftSplitUnitAtom = atom(null, (get, set, unit_id: number) => {
  const unit = draftUnits(get).find((u) => u.unit_id === unit_id);
  if (unit == null) return;
  const order = get(draftSurfaceOrderAtom);
  const top = order.indexOf(unit.t_surface as string);
  const bottom = order.indexOf(unit.b_surface as string);
  if (top < 0 || bottom < 0) return;
  // Halfway through, in surface order, between the unit's own two
  const at = Math.floor((top + bottom + 1) / 2);
  const surface = createSurface(get, set, at);

  const { unit_id: _id, ...attributes } = unit;
  updateAddedUnit(get, set, unit_id, { t_surface: surface });
  addDraftUnit(get, set, {
    ...attributes,
    t_surface: unit.t_surface,
    b_surface: surface,
  });
});

/** A surface on its own: above or below `surface_id`, or at the top of the
 * column with nothing chosen. */
export const addSurfaceAtom = atom(
  null,
  (
    get,
    set,
    { surface_id, place }: { surface_id: string | null; place: InsertPlace }
  ) => {
    const order = get(draftSurfaceOrderAtom);
    let at = 0;
    const index = order.indexOf(surface_id ?? "");
    if (index >= 0) {
      at = index;
      if (place === "below") at += 1;
    }
    placeNewSurface(get, set, at, null);
  }
);

/** A surface at `coord` on the column — a position on a measured section,
 * where it is constrained there; an age otherwise, where it takes its place
 * in the order unconstrained. Every unit spanning it is split at it; past
 * either end of the column an empty unit reaches it. */
export const draftAddSurfaceAtAtom = atom(
  null,
  (get, set, { coord }: { coord: number }) => {
    const axis = get(positionAxisAtom);
    const coords = get(workingCoordinatesAtom);
    const before = get(draftSurfaceOrderAtom);
    // Order runs top first, along a coordinate that grows downwards
    let sign = 1;
    if (axis === ColumnAxisType.HEIGHT) sign = -1;
    const key = (id: string) => (coords.get(id)?.value ?? NaN) * sign;
    let at = before.findIndex((id) => key(id) > coord * sign);
    if (at < 0) at = before.length;

    // A click is on the column as drawn: on a measured section, surfaces
    // placed only by guess are fixed where they are drawn first, so that the
    // one placed here doesn't move them
    if (axis != null) {
      for (const other of before) {
        const surface = get(draftSurfacesAtom).get(other);
        if (surface?.pos != null) continue;
        const value = coords.get(other)?.value;
        if (value == null) continue;
        set(constrainSurfaceAtom, { id: other, changes: { pos: value } });
      }
    }
    let pos: number | null = null;
    if (axis != null) pos = coord;
    placeNewSurface(get, set, at, pos);
  }
);

/** Put a new surface at `at` in the order (at `pos`, if given), and make the
 * column whole around it: every unit spanning it is split there — the unit
 * keeps its base, a copy of it runs from here to its top — and past either
 * end of the column an empty unit reaches it. Selects the surface. */
function placeNewSurface(
  get: Getter,
  set: Setter,
  at: number,
  pos: number | null
) {
  const before = get(draftSurfaceOrderAtom);
  const id = createSurface(get, set, at);
  if (pos != null) set(constrainSurfaceAtom, { id, changes: { pos } });
  const order = get(draftSurfaceOrderAtom);
  const index = new Map(order.map((d, i) => [d, i]));

  for (const unit of draftUnits(get)) {
    const top = index.get(unit.t_surface ?? "");
    const bottom = index.get(unit.b_surface ?? "");
    if (top == null || bottom == null || !(top < at && at < bottom)) continue;
    const { unit_id, ...attributes } = unit;
    updateAddedUnit(get, set, unit_id, { t_surface: id });
    addDraftUnit(get, set, { ...attributes, t_surface: unit.t_surface, b_surface: id });
  }

  // Past either end, an empty unit to reach it
  if (before.length > 0 && at === 0) {
    addDraftUnit(get, set, { t_surface: id, b_surface: before[0], unit_status: "empty" } as any);
  } else if (before.length > 0 && at === before.length) {
    addDraftUnit(get, set, {
      t_surface: before[before.length - 1],
      b_surface: id,
      unit_status: "empty",
    } as any);
  }
  set(selectedSurfaceIDAtom, id);
}

/** A unit in every gap between adjacent surfaces that no unit spans. */
export const fillUnitsAtom = atom(null, (get, set) => {
  const gaps = unfilledGaps(get(draftSurfaceOrderAtom), draftUnits(get));
  for (const [top, bottom] of gaps) {
    addDraftUnit(get, set, { t_surface: top, b_surface: bottom });
  }
});

/** Remove surfaces that no unit rests on. */
export const deleteSurfacesAtom = atom(null, (get, set, ids: string[]) => {
  const used = surfacesInUse(get);
  const removed = new Set(ids.filter((id) => !used.has(id)));
  if (removed.size === 0) return;
  const surfaces = new Map(get(draftSurfacesAtom));
  for (const id of removed) surfaces.delete(id);
  set(draftSurfacesAtom, surfaces);
  set(
    draftSurfaceOrderAtom,
    get(draftSurfaceOrderAtom).filter((id) => !removed.has(id))
  );
  if (removed.has(get(selectedSurfaceIDAtom) as string)) {
    set(selectedSurfaceIDAtom, null);
  }
});

/** The ids of the surfaces some unit rests on. */
export const draftSurfacesInUseAtom = atom((get) => surfacesInUse(get));

/** Constrain a surface — or change its constraint — directly. */
export const constrainSurfaceAtom = atom(
  null,
  (
    get,
    set,
    { id, changes }: { id: string; changes: Partial<DraftSurface> }
  ) => {
    const surface = get(draftSurfacesAtom).get(id);
    if (surface == null) return;
    const surfaces = new Map(get(draftSurfacesAtom));
    surfaces.set(id, { ...surface, ...changes });
    set(draftSurfacesAtom, surfaces);
  }
);

/** A unit's boundary edit, written to the surface it rests on, so every unit
 * sharing that surface follows. The interval's span comes along, for the
 * surface's calibration. `false` when the unit has no surface on that side. */
export const writeBoundaryToSurfaceAtom = atom(
  null,
  (
    get,
    set,
    {
      unit_id,
      side,
      values,
      intervals,
    }: {
      unit_id: number;
      side: BoundarySide;
      values: BoundaryValues;
      intervals?: Map<number, IntervalDef> | null;
    }
  ): boolean => {
    const unit = draftUnits(get).find((u) => u.unit_id === unit_id);
    let id = unit?.b_surface;
    if (side === "top") id = unit?.t_surface;
    if (id == null) return false;
    const changes = surfaceFieldsFrom(values);
    if (values.int_id != null) {
      const def = intervals?.get(values.int_id);
      if (def != null) changes.interval = { b_age: def.b_age, t_age: def.t_age };
    }
    set(constrainSurfaceAtom, { id, changes });
    return true;
  }
);

/* ------------------------------------------------------------ helpers */

function draftUnits(get: Getter): DraftUnit[] {
  return Array.from(get(addedUnitsAtom).values()) as DraftUnit[];
}

function surfacesInUse(get: Getter): Set<string> {
  const used = new Set<string>();
  for (const unit of draftUnits(get)) {
    if (unit.t_surface != null) used.add(unit.t_surface);
    if (unit.b_surface != null) used.add(unit.b_surface);
  }
  return used;
}

/** A blank surface at position `at` in the order; its id. */
function createSurface(get: Getter, set: Setter, at: number): string {
  const surfaces = new Map(get(draftSurfacesAtom));
  const id = nextSurfaceID(surfaces);
  surfaces.set(id, blankSurface(id));
  const order = [...get(draftSurfaceOrderAtom)];
  order.splice(Math.max(at, 0), 0, id);
  set(draftSurfacesAtom, surfaces);
  set(draftSurfaceOrderAtom, order);
  return id;
}

/** Move the units whose `end` is `from` (all but `except`) onto `to`. */
function moveEnds(
  get: Getter,
  set: Setter,
  end: "t_surface" | "b_surface",
  from: string,
  to: string,
  except: number
) {
  for (const unit of draftUnits(get)) {
    if (unit.unit_id === except || unit[end] !== from) continue;
    updateAddedUnit(get, set, unit.unit_id, { [end]: to });
  }
}

function updateAddedUnit(
  get: Getter,
  set: Setter,
  unit_id: number,
  changes: Partial<DraftUnit>
) {
  const added = new Map(get(addedUnitsAtom));
  const unit = added.get(unit_id);
  if (unit == null) return;
  added.set(unit_id, { ...unit, ...changes } as UnitLong);
  set(addedUnitsAtom, added);
}

/** Add a unit of a new column, and select it. Its rows' order follows its
 * surfaces, so there is no row order to keep. */
function addDraftUnit(get: Getter, set: Setter, fields: Partial<DraftUnit>) {
  const added = new Map(get(addedUnitsAtom));
  const id = nextDraftID(added.keys());
  added.set(id, blankUnit(id, fields as Partial<UnitLong>));
  set(addedUnitsAtom, added);
  set(selectedUnitIDAtom, id);
}

/** A boundary's values as a surface's constraint fields — the same names,
 * each carried only when the edit sets it. */
function surfaceFieldsFrom(values: BoundaryValues): Partial<DraftSurface> {
  const changes: Partial<DraftSurface> = {};
  for (const key of ["pos", "age", "int_id", "int_name", "prop"] as const) {
    if (values[key] !== undefined) (changes as any)[key] = values[key];
  }
  return changes;
}
