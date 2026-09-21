/** The hero's age filter, and the colors it reads units with.
 *
 * Both halves depend on the same thing: the international timescale, fetched
 * once as a map of intervals by id.
 */
import type { AgedFeature } from "./hero-data";

/** "International intervals" — every rank, from age up to eon, with colors.
 * ~56 KB, against 637 KB for `/defs/intervals?all`. */
export const INTERNATIONAL_TIMESCALE_ID = 11;

/** The shape `IntervalTag` and `IntervalField` take. */
export interface IntervalShort {
  id: number;
  name: string;
  t_age: number;
  b_age: number;
  color: string;
  rank: number;
}

/** What the hero is filtered to: an age span, and the intervals that span
 * covers, for the reader. */
export interface TimeRange {
  t_age: number;
  b_age: number;
  intervals: IntervalShort[];
}

const FALLBACK_COLOR = "#9ea5ad";

/** The filter a click produces: not the unit's own age span but the **full
 * bounds of the intervals it sits in**, so selecting something Aptian–Albian
 * brings in everything else Aptian–Albian, above and below it.
 *
 * `t_int_age` / `b_int_age` are the interval boundaries the API reports beside
 * the unit's own ages; taking the outer of the two pairs means the range can
 * only ever grow. */
export function expandedTimeRange(
  feature: AgedFeature,
  intervals: Map<number, any> | null
): TimeRange {
  const t_age = Math.min(feature.t_age, feature.t_int_age ?? Infinity);
  const b_age = Math.max(feature.b_age, feature.b_int_age ?? -Infinity);
  const bounds = { t_age, b_age };

  const spanned: IntervalShort[] = [];
  // Oldest first, which is how an interval range is named (Aptian–Albian).
  addInterval(spanned, intervals, feature.b_int_id, feature.b_int_name, bounds);
  addInterval(spanned, intervals, feature.t_int_id, feature.t_int_name, bounds);

  return { t_age, b_age, intervals: spanned };
}

/** Which intervals a selection needs looked up to be named properly. */
export function intervalIDsFor(feature: AgedFeature | null): number[] {
  if (feature == null) return [];
  const ids: number[] = [];
  if (feature.b_int_id != null) ids.push(feature.b_int_id);
  if (feature.t_int_id != null && feature.t_int_id !== feature.b_int_id) {
    ids.push(feature.t_int_id);
  }
  return ids;
}

function addInterval(
  into: IntervalShort[],
  intervals: Map<number, any> | null,
  id: number | null | undefined,
  name: string | null | undefined,
  bounds: { t_age: number; b_age: number }
) {
  if (id == null) return;
  if (into.some((d) => d.id === id)) return;
  const record = intervals?.get(id);
  if (record != null) {
    into.push(toIntervalShort(record));
    return;
  }
  // Not in the timescale we hold. Routine rather than exceptional: supereons
  // like the Precambrian aren't in the international set, and a project on its
  // own timescale (New Zealand) never is. So the chip falls back to the range's
  // own bounds rather than to zeroes — which is exactly right when there is one
  // interval, and the caller fetches the real record by id either way.
  if (name == null) return;
  into.push({
    id,
    name,
    t_age: bounds.t_age,
    b_age: bounds.b_age,
    color: FALLBACK_COLOR,
    rank: 0,
  });
}

function toIntervalShort(record: any): IntervalShort {
  return {
    id: record.int_id,
    name: record.name,
    t_age: record.t_age,
    b_age: record.b_age,
    color: record.color ?? FALLBACK_COLOR,
    rank: record.rank ?? 0,
  };
}

export function overlapsRange(
  range: TimeRange,
  t_age: number,
  b_age: number
): boolean {
  return t_age < range.b_age && b_age > range.t_age;
}

/** The intervals, oldest-span-last, so the first match containing a unit is the
 * tightest one. Built once per timescale fetch. */
export function sortedIntervals(intervals: Map<number, any> | null) {
  if (intervals == null) return null;
  const list = Array.from(intervals.values()).filter(
    (d) => d.t_age != null && d.b_age != null
  );
  list.sort((a, b) => a.b_age - a.t_age - (b.b_age - b.t_age));
  return list;
}

/** Floating-point ages from different sources rarely agree to the last digit;
 * a unit that runs to 41.03 belongs in an interval that starts at 41.03. */
const AGE_TOLERANCE = 1e-6;

/** The color of the smallest interval that contains an age span — the usual
 * reading of "colored by age": an Aptian unit takes the Aptian color, one
 * spanning Aptian and Albian takes Early Cretaceous. */
export function colorForAgeRange(
  t_age: number,
  b_age: number,
  intervals: any[] | null
): string | null {
  if (intervals == null) return null;
  for (const interval of intervals) {
    if (interval.t_age > t_age + AGE_TOLERANCE) continue;
    if (interval.b_age < b_age - AGE_TOLERANCE) continue;
    return interval.color ?? null;
  }
  return null;
}

/** The filter a featured area opens with. An interval name is resolved against
 * the timescale, so the area says "Mesozoic" and the exact bounds — and the
 * chip's color — come from the same place every other age in the hero does.
 *
 * Returns null until the timescale has arrived; the caller re-runs then. */
export function timeRangeForSpec(
  spec: string | [number, number] | null | undefined,
  intervals: Map<number, any> | null
): TimeRange | null {
  if (spec == null) return null;
  if (intervals == null) return null;

  if (typeof spec === "string") {
    const wanted = spec.toLowerCase();
    for (const record of intervals.values()) {
      if (String(record.name).toLowerCase() !== wanted) continue;
      const interval = toIntervalShort(record);
      return {
        t_age: interval.t_age,
        b_age: interval.b_age,
        intervals: [interval],
      };
    }
    return null;
  }

  const [b_age, t_age] = spec;
  const containing = colorForAgeRangeInterval(t_age, b_age, intervals);
  const named = containing == null ? [] : [containing];
  return { t_age, b_age, intervals: named };
}

/** The tightest interval containing a span, as a record rather than a color —
 * what labels an explicit numeric range. */
function colorForAgeRangeInterval(
  t_age: number,
  b_age: number,
  intervals: Map<number, any>
): IntervalShort | null {
  let best: any = null;
  for (const record of intervals.values()) {
    if (record.t_age == null || record.b_age == null) continue;
    if (record.t_age > t_age + AGE_TOLERANCE) continue;
    if (record.b_age < b_age - AGE_TOLERANCE) continue;
    if (best == null || record.b_age - record.t_age < best.b_age - best.t_age) {
      best = record;
    }
  }
  if (best == null) return null;
  return toIntervalShort(best);
}
