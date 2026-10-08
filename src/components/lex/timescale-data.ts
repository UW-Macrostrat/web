import {
  buildInternationalIntervalsTree,
  padDomain,
  type Interval,
} from "@macrostrat/timescale";
import { scaleLinear } from "d3-scale";
import { fetchAPIData } from "~/_utils";

export const INTERNATIONAL_TIMESCALE_ID = 11;

/** Timescale names are stored lowercase except for acronyms and proper names
 * ("custom COSUNA"), so only first letters are raised — not `titleCase`, which
 * lowercases the rest. */
export function capitalizeWords(name: string): string {
  return name?.replace(/(^|\s)(\S)/g, (_, space, c) => space + c.toUpperCase());
}

interface APIInterval {
  int_id: number;
  name: string;
  int_type: string;
  b_age: number;
  t_age: number;
  color: string;
}

/** `extent` (`[older, younger]`) widens the root to the span being drawn, so
 * a timescale covering only part of it is placed by age rather than packed to
 * one end. */
export function buildTimescaleTree(
  timescaleID: number,
  intervals: APIInterval[],
  rootName: string,
  extent?: [number, number]
): Interval[] {
  let tree: Interval[];
  if (timescaleID === INTERNATIONAL_TIMESCALE_ID) {
    tree = buildInternationalIntervalsTree(intervals as any);
  } else {
    tree = nestByContainment(intervals, rootName);
  }
  const [root, ...rest] = tree;
  return fillGaps([spanningRoot(root, rest, rootName, extent), ...rest]);
}

/** A root covering its intervals and `extent`. The library's international
 * root ends at 4000 Ma, younger than the Archean's base, and is shared module
 * state that `buildInternationalIntervalsTree` would rename in place. */
function spanningRoot(
  root: Interval,
  intervals: Interval[],
  name: string,
  extent?: [number, number]
): Interval {
  return {
    ...root,
    nam: name,
    eag: Math.max(...intervals.map((d) => d.eag), extent?.[0] ?? -Infinity),
    lag: Math.min(...intervals.map((d) => d.lag), extent?.[1] ?? Infinity),
  };
}

/** Most timescales are flat, but some mix ranks (zones and subzones, epochs
 * and ages) that would draw on top of each other at one level. Each interval
 * nests under the shortest interval that contains it. */
function nestByContainment(
  intervals: APIInterval[],
  rootName: string
): Interval[] {
  const longestFirst = [...intervals].sort(
    (a, b) => b.b_age - b.t_age - (a.b_age - a.t_age)
  );

  const placed: Interval[] = [];
  for (const int of longestFirst) {
    const parent = shortestContaining(placed, int);
    placed.push({
      oid: int.int_id,
      typ: "int",
      lvl: (parent?.lvl ?? 0) + 1,
      nam: int.name,
      eag: int.b_age,
      lag: int.t_age,
      pid: parent?.oid ?? 0,
      col: int.color,
      int_id: int.int_id,
    });
  }

  const root: Interval = {
    oid: 0,
    typ: "int",
    lvl: 0,
    nam: rootName,
    eag: Math.max(...placed.map((d) => d.eag)),
    lag: Math.min(...placed.map((d) => d.lag)),
    pid: null,
    col: "#ffffff",
  };
  return [root, ...placed];
}

function shortestContaining(placed: Interval[], int: APIInterval) {
  // Placed longest-first, so the last match is the shortest
  for (let i = placed.length - 1; i >= 0; i--) {
    const p = placed[i];
    if (p.eag >= int.b_age && p.lag <= int.t_age) return p;
  }
  return null;
}

/** Blank intervals wherever a parent's children leave part of it uncovered.
 * The timescale lays siblings end to end, so an uncovered span would shift
 * every interval after it off its age. */
function fillGaps(tree: Interval[]): Interval[] {
  const fillers: Interval[] = [];
  for (const parent of tree) {
    const children = tree
      .filter((d) => d.pid === parent.oid)
      .sort((a, b) => a.lag - b.lag);
    if (children.length == 0) continue;

    let age = parent.lag;
    for (const child of [...children, null]) {
      const nextAge = child?.lag ?? parent.eag;
      if (nextAge - age > 1e-6) {
        fillers.push(gapInterval(parent, age, nextAge, fillers.length));
      }
      age = Math.max(age, child?.eag ?? age);
    }
  }
  return [...tree, ...fillers];
}

function gapInterval(
  parent: Interval,
  younger: number,
  older: number,
  index: number
): Interval {
  return {
    // Negative, so it can't collide with an `int_id`
    oid: -1 - index,
    typ: "gap",
    lvl: parent.lvl + 1,
    nam: "",
    eag: older,
    lag: younger,
    pid: parent.oid,
    col: "transparent",
  };
}

export function treeDepth(tree: Interval[]): number {
  return Math.max(0, ...tree.map((d) => d.lvl));
}

/** International levels (eon = 1 … age = 5) fine enough to compare against,
 * but coarse enough to read at the span shown. */
export function referenceLevels(span: number): [number, number] {
  if (span > 1000) return [1, 3];
  if (span > 150) return [2, 4];
  if (span > 25) return [3, 5];
  return [4, 5];
}

/** Reference width of an interval's timescales, which sets the window's
 * padding below; the browser then draws them at the column's own width */
export const WINDOW_LENGTH = 970;
/** Neighboring time shown beyond each end of an interval, to click through to */
const WINDOW_PADDING = 40;

const fullExtent = scaleLinear().domain([4600, 0]).range([0, WINDOW_LENGTH]);

/** The `[older, younger]` span an interval's timescales are clipped to. Pure,
 * so the server fetches exactly the intervals the client draws. */
export function intervalWindow(interval: {
  b_age: number;
  t_age: number;
}): [number, number] | null {
  const { b_age, t_age } = interval ?? {};
  if (b_age == null || t_age == null) return null;
  return padDomain(fullExtent, [b_age, t_age], WINDOW_PADDING);
}

/** Intervals of every timescale the interval belongs to, plus the
 * international timescale, that overlap its window. Each carries its full
 * `timescales` membership. */
export async function fetchIntervalWindow(interval: any) {
  const ageWindow = intervalWindow(interval);
  if (ageWindow == null) return [];
  const ids = new Set([
    INTERNATIONAL_TIMESCALE_ID,
    ...(interval.timescales ?? []).map((t) => t.timescale_id),
  ]);
  const [older, younger] = ageWindow;
  return fetchAPIData("/defs/intervals", {
    timescale_id: [...ids].join(","),
    b_age: older,
    t_age: younger,
  }).catch(() => []);
}
