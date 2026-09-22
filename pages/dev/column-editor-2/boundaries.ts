/** Editing a unit's own boundary fields — the unified view's business.
 *
 * The [[column-ingestion]] `units` sheet has no surfaces table: a unit carries
 * its own bottom and top, positionally (`b_pos`/`t_pos`) and
 * chronostratigraphically (`b_int`/`b_prop`, `t_int`/`t_prop`), and a surface
 * is merely what you get when two units happen to share a value. The unified
 * sheet is that table, so an edit here writes a unit's field rather than
 * moving a surface.
 *
 * Whether the units that *did* share the old value come along is the
 * **preserve surfaces** setting. With it on, a boundary is still a surface and
 * the whole thing moves; with it off, typing splits the surface, which is a
 * legitimate edit in the spreadsheet and the only way to say that two units no
 * longer meet.
 *
 * Pure functions — the atoms are in `./state`.
 */
import type { UnitLong } from "@macrostrat/api-types";
import { ColumnAxisType } from "@macrostrat/column-components";
import { positionValue } from "./scale";

/** Ages closer than this are one boundary */
export const AGE_TOLERANCE = 0.001;

/** Positions closer than this (metres) are one boundary. Looser than the age
 * tolerance because measured positions are recorded to the centimetre at best,
 * and the eODP columns carry them as three-decimal strings. */
export const POSITION_TOLERANCE = 0.01;

export type BoundarySide = "top" | "bottom";

/** Which index a boundary field addresses: the measured position, or the
 * chronostratigraphic position (an interval and a proportion within it, from
 * which the age follows). */
export type BoundaryKind = "position" | "chrono";

/** Anything with an age span: an interval definition, or the calibration
 * carried on a surface. */
export interface AgeSpan {
  b_age: number;
  t_age: number;
}

/** An interval as `useMacrostratDefs("intervals")` holds it. */
export interface IntervalDef extends AgeSpan {
  int_id: number;
  name: string;
}

/** A boundary's value, side-neutral, so the same edit can be written to a
 * unit's top or its bottom. */
export interface BoundaryValues {
  pos?: number;
  age?: number;
  int_id?: number;
  int_name?: string;
  prop?: number;
}

/** Which unit fields a boundary edit can be started from, and what each one
 * means. Everything else in the sheet is an ordinary unit attribute. */
const BOUNDARY_FIELDS: Record<
  string,
  {
    side: BoundarySide;
    kind: BoundaryKind;
    field: "pos" | "age" | "prop" | "int";
  }
> = {
  b_pos: { side: "bottom", kind: "position", field: "pos" },
  t_pos: { side: "top", kind: "position", field: "pos" },
  b_age: { side: "bottom", kind: "chrono", field: "age" },
  t_age: { side: "top", kind: "chrono", field: "age" },
  b_prop: { side: "bottom", kind: "chrono", field: "prop" },
  t_prop: { side: "top", kind: "chrono", field: "prop" },
  b_int_name: { side: "bottom", kind: "chrono", field: "int" },
  t_int_name: { side: "top", kind: "chrono", field: "int" },
};

export function boundaryFieldInfo(key: string) {
  return BOUNDARY_FIELDS[key] ?? null;
}

/* ------------------------------------------------- interval arithmetic */

/** The age of a proportion within an interval: 0 at the interval's base (its
 * older bound), 1 at its top — the same convention as the ingestion format
 * and the ingestion format. */
export function ageForProportion(
  interval: AgeSpan | null | undefined,
  prop: number | null | undefined
): number | null {
  if (interval == null || prop == null || isNaN(prop)) return null;
  const span = interval.b_age - interval.t_age;
  if (!(span > 0)) return null;
  return interval.b_age - prop * span;
}

/** Where an age falls within an interval, on the same 0-at-the-base scale. */
export function proportionForAge(
  interval: AgeSpan | null | undefined,
  age: number | null | undefined
): number | null {
  if (interval == null || age == null || isNaN(age)) return null;
  const span = interval.b_age - interval.t_age;
  if (!(span > 0)) return null;
  const prop = (interval.b_age - age) / span;
  return Math.min(Math.max(prop, 0), 1);
}

/** Find an interval by name, case- and whitespace-insensitively. */
export function findIntervalByName(
  intervals: Map<number, IntervalDef> | null | undefined,
  name: string
): IntervalDef | null {
  if (intervals == null) return null;
  const wanted = name.trim().toLowerCase();
  if (wanted === "") return null;
  for (const interval of intervals.values()) {
    if (interval.name?.trim().toLowerCase() === wanted) return interval;
  }
  return null;
}

/* ----------------------------------------------------- reading a boundary */

/** A unit's coordinate on one side, under one index. `null` when it has none
 * — a unit with no measured position, say. */
export function unitBoundary(
  unit: UnitLong,
  side: BoundarySide,
  kind: BoundaryKind
): number | null {
  const prefix = side === "top" ? "t" : "b";
  if (kind === "position") return positionValue(unit[`${prefix}_pos`]);
  const age = unit[`${prefix}_age`];
  if (age == null || isNaN(age)) return null;
  return age;
}

export function boundaryTolerance(kind: BoundaryKind): number {
  if (kind === "position") return POSITION_TOLERANCE;
  return AGE_TOLERANCE;
}

/** The axis two units share when their boundaries are compared under a given
 * index — what `unitsOverlap` needs to judge an overlap. */
export function axisForKind(
  kind: BoundaryKind,
  positionAxis: ColumnAxisType | null
): ColumnAxisType {
  if (kind === "position") return positionAxis ?? ColumnAxisType.HEIGHT;
  return ColumnAxisType.AGE;
}

/* ----------------------------------------------------- writing a boundary */

/** Resolve a typed cell into the boundary it describes. `null` when the value
 * isn't usable (an unparseable number), so the edit is simply dropped.
 *
 * A chronostratigraphic edit carries the age it implies *when the interval is
 * known*, so the column moves as you type. An interval name that matches no
 * definition is still recorded — the sheet is a data-entry surface, and the
 * ingestion format takes names, not ids — but it moves nothing. */
export function readBoundaryEdit(
  unit: UnitLong,
  key: string,
  rawValue: any,
  intervals: Map<number, IntervalDef> | null
): { side: BoundarySide; kind: BoundaryKind; values: BoundaryValues } | null {
  const info = boundaryFieldInfo(key);
  if (info == null) return null;
  const { side, kind, field } = info;
  const prefix = side === "top" ? "t" : "b";

  if (field === "pos") {
    const pos = Number(rawValue);
    if (rawValue === "" || rawValue == null || isNaN(pos)) return null;
    return { side, kind, values: { pos } };
  }

  if (field === "age") {
    const age = Number(rawValue);
    if (rawValue === "" || rawValue == null || isNaN(age)) return null;
    const interval = intervals?.get(unit[`${prefix}_int_id`]) ?? null;
    const values: BoundaryValues = { age };
    // Keep the calibration honest: the interval is unchanged, so the
    // proportion within it follows the new age.
    const prop = proportionForAge(interval, age);
    if (prop != null) values.prop = prop;
    return { side, kind, values };
  }

  if (field === "prop") {
    const prop = Number(rawValue);
    if (rawValue === "" || rawValue == null || isNaN(prop)) return null;
    const interval = intervals?.get(unit[`${prefix}_int_id`]) ?? null;
    const values: BoundaryValues = { prop };
    const age = ageForProportion(interval, prop);
    if (age != null) values.age = age;
    return { side, kind, values };
  }

  // An interval by name: the proportion within it is unchanged, so the age
  // follows from the new interval's span.
  const text = String(rawValue ?? "").trim();
  if (text === "") return null;
  const def = findIntervalByName(intervals, text);
  if (def == null) return { side, kind, values: { int_name: text } };
  const prop = unit[`${prefix}_prop`];
  const values: BoundaryValues = { int_id: def.int_id, int_name: def.name };
  const age = ageForProportion(def, prop);
  if (age != null) {
    values.age = age;
    values.prop = prop;
  }
  return { side, kind, values };
}

/** A boundary's values written to one side of a unit. */
export function sideChanges(
  side: BoundarySide,
  values: BoundaryValues
): Partial<UnitLong> {
  const prefix = side === "top" ? "t" : "b";
  const changes: any = {};
  if (values.pos != null) changes[`${prefix}_pos`] = values.pos;
  if (values.age != null) changes[`${prefix}_age`] = values.age;
  if (values.int_id != null) changes[`${prefix}_int_id`] = values.int_id;
  if (values.int_name != null) changes[`${prefix}_int_name`] = values.int_name;
  if (values.prop != null) changes[`${prefix}_prop`] = values.prop;
  return changes;
}
