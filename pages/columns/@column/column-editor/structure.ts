/** A column's structure — which units it has, and where each one sits — as
 * opposed to the values of the units in it. Pure model: the atoms that add,
 * split and remove units are in `./state/structure`.
 *
 * A unit is placed by its two boundaries, so every structural edit is a
 * statement about boundaries:
 *
 * - **A unit above or below** another shares that unit's boundary on the side
 *   it touches, and extends away from it — by the same thickness on a
 *   measured column, to the end of the shared boundary's interval on an age
 *   column. In the middle of a column that runs into the neighbour; the
 *   overlap is flagged, not prevented, like any other.
 * - **Splitting** a unit puts a new surface through it: the unit keeps its
 *   base, a copy of it takes its top, and the two meet — halfway, or at a
 *   height clicked on the column.
 * - **Extending** the column to a height past its end adds an *empty* unit
 *   between its last boundary and that height.
 *
 * New units have negative ids, so they can't be mistaken for Macrostrat's.
 */
import type { UnitLong } from "@macrostrat/api-types";
import { ColumnAxisType } from "@macrostrat/column-components";
import { positionValue } from "./scale";
import {
  ageForProportion,
  proportionForAge,
  type BoundarySide,
  type IntervalDef,
} from "./boundaries";

export type InsertPlace = "above" | "below";

export type IntervalMap = Map<number, IntervalDef> | null;

export interface StructureOptions {
  /** The column's position axis, when its units are measured. */
  positionAxis: ColumnAxisType | null;
  intervals: IntervalMap;
}

/** A unit next to `reference`: sharing its top (`above`) or its base
 * (`below`), with the reference's section and nothing else of it. */
export function unitNextTo(
  reference: UnitLong,
  place: InsertPlace,
  unit_id: number,
  opts: StructureOptions
): UnitLong {
  let shared: BoundarySide = "bottom";
  let far: BoundarySide = "top";
  let sharedOnReference: BoundarySide = "top";
  if (place === "below") {
    shared = "top";
    far = "bottom";
    sharedOnReference = "bottom";
  }
  const boundary = boundaryOf(reference, sharedOnReference);
  const farBoundary = extendBoundary(reference, boundary, far, opts);
  return blankUnit(unit_id, {
    section_id: reference.section_id,
    col_id: reference.col_id,
    ...boundaryFields(shared, boundary),
    ...boundaryFields(far, farBoundary),
  });
}

/** The first unit of an empty column: on a measured column, a metre at the
 * datum; on an age column, nowhere yet — its intervals are the first thing
 * to enter. */
export function firstUnit(unit_id: number, opts: StructureOptions): UnitLong {
  const { positionAxis } = opts;
  if (positionAxis == null) return blankUnit(unit_id, {});
  if (positionAxis === ColumnAxisType.DEPTH) {
    return blankUnit(unit_id, { t_pos: 0, b_pos: 1 });
  }
  return blankUnit(unit_id, { t_pos: 1, b_pos: 0 });
}

/** A unit split in two by a new surface halfway through it: the unit itself,
 * now ending at the surface, and a copy of it above the surface. `null` when
 * the unit has no extent to split. */
export function splitUnit(
  unit: UnitLong,
  unit_id: number,
  opts: StructureOptions
): { lower: Partial<UnitLong>; upper: UnitLong } | null {
  const middle = middleBoundary(unit, opts);
  if (middle == null) return null;
  const { unit_id: _id, ...attributes } = unit;
  return {
    lower: boundaryFields("top", middle),
    upper: {
      ...attributes,
      unit_id,
      ...boundaryFields("bottom", middle),
    } as UnitLong,
  };
}

/** Split a unit at `coord` on the index in force (`kind`): a position, or an
 * age. `null` unless the coordinate falls inside the unit. */
export function splitUnitAt(
  unit: UnitLong,
  coord: number,
  kind: "position" | "chrono",
  unit_id: number,
  opts: StructureOptions
): { lower: Partial<UnitLong>; upper: UnitLong } | null {
  const surface = boundaryAt(unit, coord, kind, opts);
  if (surface == null) return null;
  const { unit_id: _id, ...attributes } = unit;
  return {
    lower: boundaryFields("top", surface),
    upper: {
      ...attributes,
      unit_id,
      ...boundaryFields("bottom", surface),
    } as UnitLong,
  };
}

/** An empty unit from `reference`'s outer boundary (its top, `above`; its
 * base, `below`) out to `coord`, extending the column to it. */
export function extensionUnit(
  reference: UnitLong,
  place: InsertPlace,
  coord: number,
  kind: "position" | "chrono",
  unit_id: number,
  opts: StructureOptions
): UnitLong {
  let shared: BoundarySide = "bottom";
  let far: BoundarySide = "top";
  let onReference: BoundarySide = "top";
  if (place === "below") {
    shared = "top";
    far = "bottom";
    onReference = "bottom";
  }
  const boundary = boundaryOf(reference, onReference);
  let outer: Boundary = { ...blankBoundary(), pos: coord };
  if (kind === "chrono") outer = chronoBoundary(coord, [], opts.intervals);
  return blankUnit(unit_id, {
    section_id: reference.section_id,
    col_id: reference.col_id,
    unit_status: "empty",
    ...boundaryFields(shared, boundary),
    ...boundaryFields(far, outer),
  } as Partial<UnitLong>);
}

/** Whether `coord` falls strictly inside a unit, on the index in force. */
export function unitContains(
  unit: UnitLong,
  coord: number,
  kind: "position" | "chrono"
): boolean {
  const [a, b] = unitExtent(unit, kind);
  if (a == null || b == null) return false;
  return Math.min(a, b) < coord && coord < Math.max(a, b);
}

/** A unit's top and base on one index. */
export function unitExtent(
  unit: UnitLong,
  kind: "position" | "chrono"
): [number | null, number | null] {
  const top = boundaryOf(unit, "top");
  const bottom = boundaryOf(unit, "bottom");
  if (kind === "position") return [top.pos, bottom.pos];
  return [top.age, bottom.age];
}

/** The boundary at `coord` inside a unit: the coordinate itself, and the other
 * index's value at the same point, interpolated between the unit's own —
 * with the age placed in an interval, as a split halfway is. */
function boundaryAt(
  unit: UnitLong,
  coord: number,
  kind: "position" | "chrono",
  opts: StructureOptions
): Boundary | null {
  if (!unitContains(unit, coord, kind)) return null;
  const top = boundaryOf(unit, "top");
  const bottom = boundaryOf(unit, "bottom");
  const [t, b] = unitExtent(unit, kind);
  const f = (coord - (t as number)) / ((b as number) - (t as number));
  let pos: number | null = null;
  let age: number | null = null;
  if (kind === "position") {
    pos = coord;
    if (top.age != null && bottom.age != null) age = top.age + f * (bottom.age - top.age);
  } else {
    age = coord;
    if (top.pos != null && bottom.pos != null) pos = top.pos + f * (bottom.pos - top.pos);
  }
  if (age == null) return { ...blankBoundary(), pos };
  const named = [top.int_id, bottom.int_id]
    .map((id) => intervalFor(id, opts.intervals))
    .filter((d): d is IntervalDef => d != null);
  return { ...chronoBoundary(age, named, opts.intervals), pos };
}

/** An age as a boundary: the finest of `preferred` that holds it, else the
 * finest of all, and the proportion within it. */
function chronoBoundary(
  age: number,
  preferred: IntervalDef[],
  intervals: IntervalMap
): Boundary {
  const interval =
    finestContaining(preferred, age) ??
    finestContaining(intervals?.values() ?? [], age);
  return {
    pos: null,
    age,
    int_id: interval?.int_id ?? null,
    int_name: interval?.name ?? null,
    prop: proportionForAge(interval, age),
  };
}

function blankBoundary(): Boundary {
  return { pos: null, age: null, int_id: null, int_name: null, prop: null };
}

/** The lowest id not yet used, counting down from −1. */
export function nextDraftID(ids: Iterable<number>): number {
  let min = 0;
  for (const id of ids) {
    if (id < min) min = id;
  }
  return min - 1;
}

/** A unit with every field empty, and `fields` over that. */
export function blankUnit(
  unit_id: number,
  fields: Partial<UnitLong>
): UnitLong {
  return {
    unit_id,
    section_id: null,
    col_id: null,
    unit_name: "",
    strat_name_long: null,
    strat_name_id: null,
    lith: [],
    environ: [],
    econ: [],
    notes: "",
    min_thick: null,
    max_thick: null,
    t_pos: null,
    b_pos: null,
    t_age: null,
    b_age: null,
    t_int_id: null,
    t_int_name: null,
    t_prop: null,
    b_int_id: null,
    b_int_name: null,
    b_prop: null,
    ...fields,
  } as any;
}

/* ---------------------------------------------------------- boundaries */

/** One side of a unit, side-neutral. */
interface Boundary {
  pos: number | null;
  age: number | null;
  int_id: number | null;
  int_name: string | null;
  prop: number | null;
}

function boundaryOf(unit: UnitLong, side: BoundarySide): Boundary {
  const p = prefix(side);
  return {
    pos: positionValue(unit[`${p}_pos`]),
    age: numberOrNull(unit[`${p}_age`]),
    int_id: unit[`${p}_int_id`] ?? null,
    int_name: unit[`${p}_int_name`] ?? null,
    prop: numberOrNull(unit[`${p}_prop`]),
  };
}

function boundaryFields(
  side: BoundarySide,
  boundary: Boundary
): Partial<UnitLong> {
  const p = prefix(side);
  return {
    [`${p}_pos`]: boundary.pos,
    [`${p}_age`]: boundary.age,
    [`${p}_int_id`]: boundary.int_id,
    [`${p}_int_name`]: boundary.int_name,
    [`${p}_prop`]: boundary.prop,
  } as Partial<UnitLong>;
}

/** The far boundary of a unit placed against `boundary`, extending towards
 * `far`: the reference unit's thickness away on a measured column, and the
 * far end of the boundary's interval on an age column. Where there is
 * nothing to extend by, the unit starts with no extent — flagged, for the
 * user to set. */
function extendBoundary(
  reference: UnitLong,
  boundary: Boundary,
  far: BoundarySide,
  opts: StructureOptions
): Boundary {
  let pos: number | null = null;
  if (boundary.pos != null) {
    const thickness = unitThickness(reference) ?? 1;
    // Upwards is towards larger positions on a height axis, smaller on depth
    let up = 1;
    if (opts.positionAxis === ColumnAxisType.DEPTH) up = -1;
    let direction = up;
    if (far === "bottom") direction = -up;
    pos = boundary.pos + direction * thickness;
  }

  // The top of an interval is 1, its base 0
  let prop = 0;
  if (far === "top") prop = 1;
  const interval = intervalFor(boundary.int_id, opts.intervals);
  let chrono = {
    int_id: boundary.int_id,
    int_name: boundary.int_name,
    prop: boundary.prop,
    age: boundary.age,
  };
  if (interval != null && boundary.prop !== prop) {
    chrono = {
      int_id: interval.int_id,
      int_name: interval.name,
      prop,
      age: ageForProportion(interval, prop),
    };
  }
  return { pos, ...chrono };
}

/** Halfway through a unit, on every index it has: the mean position, and the
 * mean age placed in an interval — the unit's own when both its boundaries
 * are in one, else the finest interval its boundaries name that holds it,
 * else the finest of all. */
function middleBoundary(
  unit: UnitLong,
  opts: StructureOptions
): Boundary | null {
  const top = boundaryOf(unit, "top");
  const bottom = boundaryOf(unit, "bottom");

  let pos: number | null = null;
  if (top.pos != null && bottom.pos != null) pos = (top.pos + bottom.pos) / 2;

  let age: number | null = null;
  if (top.age != null && bottom.age != null) age = (top.age + bottom.age) / 2;

  if (pos == null && age == null) return null;

  let interval: IntervalDef | null = null;
  if (age != null) {
    const named = [top.int_id, bottom.int_id]
      .map((id) => intervalFor(id, opts.intervals))
      .filter((d): d is IntervalDef => d != null);
    interval =
      finestContaining(named, age) ??
      finestContaining(opts.intervals?.values() ?? [], age);
  }

  return {
    pos,
    age,
    int_id: interval?.int_id ?? null,
    int_name: interval?.name ?? null,
    prop: proportionForAge(interval, age),
  };
}

function finestContaining(
  intervals: Iterable<IntervalDef>,
  age: number
): IntervalDef | null {
  let best: IntervalDef | null = null;
  for (const interval of intervals) {
    if (!(interval.b_age >= age && interval.t_age <= age)) continue;
    const span = interval.b_age - interval.t_age;
    if (best == null || span < best.b_age - best.t_age) best = interval;
  }
  return best;
}

function unitThickness(unit: UnitLong): number | null {
  const t = positionValue(unit.t_pos);
  const b = positionValue(unit.b_pos);
  if (t == null || b == null || t === b) return null;
  return Math.abs(t - b);
}

function intervalFor(
  int_id: number | null,
  intervals: IntervalMap
): IntervalDef | null {
  if (int_id == null || intervals == null) return null;
  return intervals.get(int_id) ?? null;
}

function prefix(side: BoundarySide): "t" | "b" {
  if (side === "top") return "t";
  return "b";
}

function numberOrNull(value: unknown): number | null {
  if (value == null || value === "") return null;
  const num = Number(value);
  if (isNaN(num)) return null;
  return num;
}
