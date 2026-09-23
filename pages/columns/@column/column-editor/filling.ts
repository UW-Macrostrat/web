/** Attribute filling, as the [[column-ingestion]] format has it: on a measured
 * column, a descriptor left blank on a unit is taken from the unit below
 * (above, on a depth column), so `lithology`, `environment` and the like are
 * entered once at the base of a package and carried up. A loaded column has
 * every value written out, so the reverse question is the useful one here —
 * which cells are *restatements* of their neighbour's value, and so could have
 * been left blank. Those are drawn dimmed, with an arrow towards the unit
 * they repeat. Pure functions; the atom is in `./state/presentation`.
 */
import type { UnitLong } from "@macrostrat/api-types";
import { ColumnAxisType } from "@macrostrat/column-components";
import { positionValue } from "./scale";

/** The unit fields the format fills. Fields referenced to one unit — its
 * name, its description — are never filled, and neither are boundaries. */
export const FILLED_FIELDS = ["lith", "environ", "strat_name_long"] as const;

export type FilledField = (typeof FILLED_FIELDS)[number];

/** A cell that restates its neighbour: `${unit_id}:${field}`. */
export type RestatementKey = `${number}:${string}`;

export function restatementKey(unit_id: number, field: string): RestatementKey {
  return `${unit_id}:${field}`;
}

/**
 * The cells whose value merely repeats the unit before them in fill order.
 *
 * Filling runs along the positional axis, so a column without one — a
 * composite column ordered by age — fills nothing, exactly as the format
 * disables filling when there are no positional columns. Units are compared
 * within their section only, in the direction values are filled: upwards on
 * a height axis, downwards on a depth axis.
 */
export function filledRestatements(
  units: UnitLong[],
  positionAxis: ColumnAxisType | null,
  fields: readonly string[] = FILLED_FIELDS
): Set<RestatementKey> {
  const out = new Set<RestatementKey>();
  if (positionAxis == null) return out;

  const bySection = new Map<number | null, UnitLong[]>();
  for (const unit of units) {
    if (positionValue(unit.b_pos) == null) continue;
    const key = unit.section_id ?? null;
    if (!bySection.has(key)) bySection.set(key, []);
    bySection.get(key)!.push(unit);
  }

  for (const section of bySection.values()) {
    section.sort((a, b) => fillOrder(a, b, positionAxis));
    let previous: UnitLong | null = null;
    for (const unit of section) {
      if (previous != null) {
        for (const field of fields) {
          const value = unit[field];
          if (isBlank(value)) continue;
          if (sameAttribute(value, previous[field])) {
            out.add(restatementKey(unit.unit_id, field));
          }
        }
      }
      previous = unit;
    }
  }
  return out;
}

/** The direction an attribute would be filled: upwards on a height axis,
 * from the lowest base; downwards on a depth axis, from the shallowest. */
export function fillDirection(
  positionAxis: ColumnAxisType | null
): "up" | "down" | null {
  if (positionAxis == null) return null;
  if (positionAxis === ColumnAxisType.DEPTH) return "down";
  return "up";
}

function fillOrder(a: UnitLong, b: UnitLong, axis: ColumnAxisType): number {
  const pa = positionValue(a.b_pos) ?? 0;
  const pb = positionValue(b.b_pos) ?? 0;
  if (axis === ColumnAxisType.DEPTH) return pb - pa;
  return pa - pb;
}

function isBlank(value: unknown): boolean {
  if (value == null || value === "") return true;
  return Array.isArray(value) && value.length === 0;
}

/** Attribute values compared as the format would read them: arrays of
 * definitions by their names and proportions, in order; scalars by string. */
export function sameAttribute(a: unknown, b: unknown): boolean {
  if (isBlank(a) || isBlank(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, i) => attributeToken(item) === attributeToken(b[i]));
  }
  return String(a) === String(b);
}

function attributeToken(item: any): string {
  if (item == null) return "";
  if (typeof item !== "object") return String(item);
  const atts = Array.isArray(item.atts) ? item.atts.join(" ") : "";
  return `${atts}|${item.name ?? item.lith_id ?? item.environ_id}|${
    item.prop ?? ""
  }`;
}
