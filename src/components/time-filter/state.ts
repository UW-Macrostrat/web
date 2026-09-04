/** Shared time (age) filter for Macrostrat's column, correlation and map
 * pages.
 *
 * The filter is a small, URL-friendly record — a Macrostrat interval id and/or
 * an explicit `t_age`/`b_age` pair — so that every time-filtered page can be
 * linked to the same way. Storage is deliberately *not* decided here: a page
 * supplies the atom that backs the filter (a hash-param atom on the column
 * page, a query-param atom elsewhere) through `TimeFilterProvider`, and the
 * hooks and components in this module only ever talk to that atom.
 */
import { atom, useAtom, useAtomValue, useSetAtom, WritableAtom } from "jotai";
import h from "@macrostrat/hyper";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type {
  Interval,
  IntervalStyleBuilder,
  TimescaleClickHandler,
} from "@macrostrat/timescale";
import { useAnimatedAgeWindow, type AgeWindow } from "@macrostrat/column-views";
import type { IntervalShort } from "@macrostrat/data-components";
import { useMacrostratStore } from "@macrostrat/data-provider";
import type { MacrostratInterval } from "@macrostrat/api-types";

/** The time filter as it appears in a URL. An interval alone means "its full
 * span"; ages given alongside an interval refine the window within it. Ages are
 * in Ma, `t_age` the younger bound and `b_age` the older. */
export interface TimeFilterParams {
  int_id?: number;
  t_age?: number;
  b_age?: number;
}

export type TimeFilterAtom = WritableAtom<
  TimeFilterParams | null,
  [TimeFilterParams | null],
  void
>;

export const TIME_FILTER_KEYS = ["int_id", "t_age", "b_age"] as const;

/** A filter resolved against interval definitions, ready to render. */
export interface ResolvedTimeFilter {
  /** The render window, or `null` while an interval definition is loading. */
  window: AgeWindow | null;
  interval: IntervalShort | null;
  /** True when explicit ages narrow the window inside the interval. */
  isRefined: boolean;
}

// URL serialization ---------------------------------------------------------

export function parseTimeFilterParams(
  params: URLSearchParams
): TimeFilterParams | null {
  return normalizeTimeFilter({
    int_id: parseInteger(params.get("int_id")),
    t_age: parseNumber(params.get("t_age")),
    b_age: parseNumber(params.get("b_age")),
  });
}

/** String values for the filter's URL keys. Unset keys are `undefined` so a
 * caller merging into an existing params object drops them. */
export function timeFilterToParams(
  filter: TimeFilterParams | null
): Record<(typeof TIME_FILTER_KEYS)[number], string | undefined> {
  const f = filter ?? {};
  return {
    int_id: f.int_id?.toString(),
    t_age: f.t_age?.toString(),
    b_age: f.b_age?.toString(),
  };
}

/** Drop unset keys, returning `null` for an empty filter. */
export function normalizeTimeFilter(
  filter: TimeFilterParams | null | undefined
): TimeFilterParams | null {
  if (filter == null) return null;
  const out: TimeFilterParams = {};
  if (isFiniteNumber(filter.int_id)) out.int_id = filter.int_id;
  if (isFiniteNumber(filter.t_age)) out.t_age = filter.t_age;
  if (isFiniteNumber(filter.b_age)) out.b_age = filter.b_age;
  if (Object.keys(out).length === 0) return null;
  return out;
}

export function timeFiltersEqual(
  a: TimeFilterParams | null,
  b: TimeFilterParams | null
): boolean {
  if (a == null || b == null) return a == b;
  return a.int_id == b.int_id && a.t_age == b.t_age && a.b_age == b.b_age;
}

// Provider ------------------------------------------------------------------

/** Fallback storage when no page-level atom is provided: in memory only, not
 * linkable. Lets the components work anywhere (e.g. a map sidebar) while a
 * page decides whether the filter belongs in its URL. */
const memoryTimeFilterAtom: TimeFilterAtom = atom<TimeFilterParams | null>(
  null
);

const TimeFilterContext = createContext<TimeFilterAtom>(memoryTimeFilterAtom);

export function TimeFilterProvider({
  atom: filterAtom,
  children,
}: {
  atom: TimeFilterAtom;
  children?: ReactNode;
}) {
  return h(TimeFilterContext.Provider, { value: filterAtom }, children);
}

export function useTimeFilterAtom(): TimeFilterAtom {
  return useContext(TimeFilterContext);
}

// Interval lookups ----------------------------------------------------------

/** Intervals the user has already seen (clicked on a timescale, picked in a
 * panel). Resolving a filter checks here first so the tag renders at once,
 * and only falls back to the API for an id that arrived by URL. */
const knownIntervalsAtom = atom<Map<number, IntervalShort>>(new Map());

const rememberIntervalAtom = atom(null, (get, set, interval: IntervalShort) => {
  const prev = get(knownIntervalsAtom);
  if (prev.get(interval.id) === interval) return;
  const next = new Map(prev);
  next.set(interval.id, interval);
  set(knownIntervalsAtom, next);
});

const intervalLevels = { eon: 1, era: 2, period: 3, epoch: 4, age: 5 };

/** Adapt a timescale `Interval` (as delivered by a timescale click) to the tag
 * shape used by `@macrostrat/data-components`. */
export function intervalShortFromTimescale(interval: Interval): IntervalShort {
  return {
    id: interval.int_id ?? interval.oid,
    name: interval.nam,
    color: interval.col,
    b_age: interval.eag,
    t_age: interval.lag,
    rank: interval.lvl,
  };
}

/** Adapt a Macrostrat API interval definition to the tag shape. */
export function intervalShortFromDefinition(
  def: MacrostratInterval
): IntervalShort {
  return {
    id: def.int_id,
    name: def.name,
    color: def.color,
    b_age: def.b_age,
    t_age: def.t_age,
    rank: intervalLevels[def.int_type] ?? 0,
  };
}

/** Resolve an interval id through the ambient `MacrostratDataProvider` store.
 * Returns `null` while loading or when the id is unknown. */
function useIntervalDefinition(int_id: number | null): IntervalShort | null {
  const getIntervals = useMacrostratStore((s) => s.getIntervals);
  const [def, setDef] = useState<IntervalShort | null>(null);
  useEffect(() => {
    setDef(null);
    if (int_id == null) return;
    let cancelled = false;
    getIntervals([int_id], null)
      .then((res) => {
        if (cancelled) return;
        const match = res?.find((d) => d?.int_id === int_id);
        if (match == null) return;
        setDef(intervalShortFromDefinition(match));
      })
      .catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [int_id, getIntervals]);
  return def;
}

export function useIntervalShort(int_id: number | null): IntervalShort | null {
  const known = useAtomValue(knownIntervalsAtom);
  // Only reach for the API when the interval hasn't been seen this session
  let toFetch: number | null = int_id;
  if (int_id != null && known.has(int_id)) {
    toFetch = null;
  }
  const fetched = useIntervalDefinition(toFetch);
  if (int_id == null) return null;
  return known.get(int_id) ?? fetched;
}

// Hooks ----------------------------------------------------------------------

export interface TimeFilterActions {
  filter: TimeFilterParams | null;
  setFilter(filter: TimeFilterParams | null): void;
  clear(): void;
  /** Filter to an interval's full span. */
  selectInterval(interval: IntervalShort): void;
  /** Filter to an explicit age range (either bound may be omitted). Drops any
   * interval, since the range no longer describes one. */
  setAgeRange(range: { t_age?: number | null; b_age?: number | null }): void;
}

export function useTimeFilter(): TimeFilterActions {
  const filterAtom = useTimeFilterAtom();
  const [filter, setRaw] = useAtom(filterAtom);
  const remember = useSetAtom(rememberIntervalAtom);

  const setFilter = useCallback(
    (next: TimeFilterParams | null) => {
      setRaw(normalizeTimeFilter(next));
    },
    [setRaw]
  );

  const clear = useCallback(() => setRaw(null), [setRaw]);

  const selectInterval = useCallback(
    (interval: IntervalShort) => {
      remember(interval);
      setRaw({ int_id: interval.id });
    },
    [setRaw, remember]
  );

  const setAgeRange = useCallback(
    (range: { t_age?: number | null; b_age?: number | null }) => {
      setRaw(
        normalizeTimeFilter({
          t_age: range.t_age ?? undefined,
          b_age: range.b_age ?? undefined,
        })
      );
    },
    [setRaw]
  );

  return { filter, setFilter, clear, selectInterval, setAgeRange };
}

/** Resolve the current filter to a render window and an interval tag. */
export function useResolvedTimeFilter(): ResolvedTimeFilter | null {
  const filter = useAtomValue(useTimeFilterAtom());
  const interval = useIntervalShort(filter?.int_id ?? null);
  if (filter == null) return null;

  let window: AgeWindow | null = null;
  let isRefined = false;
  if (filter.int_id == null) {
    // Age-only filter: an open-ended bound is left for the caller to fill.
    window = { t_age: filter.t_age ?? 0, b_age: filter.b_age ?? Infinity };
  } else if (interval != null) {
    const t_age = filter.t_age ?? interval.t_age;
    const b_age = filter.b_age ?? interval.b_age;
    window = { t_age, b_age };
    isRefined = t_age !== interval.t_age || b_age !== interval.b_age;
  }
  return { window, interval, isRefined };
}

export interface TimeFilterWindowOptions {
  /** The full data extent (the window with no filter). `null` until known. */
  fullExtent: AgeWindow | null;
  duration?: number;
}

export interface TimeFilterWindow {
  /** The animated window to hand to `t_age`/`b_age` column props. */
  window: AgeWindow | null;
  isAnimating: boolean;
  isFullExtent: boolean;
  resolved: ResolvedTimeFilter | null;
  /** Timescale click handler implementing interval navigation: clicking an
   * interval filters to it; clicking the interval already selected steps out
   * to its parent, or clears the filter at the top of the tree. */
  onClickTimescaleInterval: TimescaleClickHandler;
  /** Bolds the selected interval on the timescale. */
  timescaleIntervalStyle: IntervalStyleBuilder;
}

/** Drive a column or correlation chart's age window from the shared filter,
 * animating between targets with `useAnimatedAgeWindow`. */
export function useTimeFilterWindow(
  options: TimeFilterWindowOptions
): TimeFilterWindow {
  const { fullExtent, duration } = options;
  const { filter, selectInterval, setFilter, clear } = useTimeFilter();
  const resolved = useResolvedTimeFilter();
  const anim = useAnimatedAgeWindow({ fullExtent, duration });

  const target = clampWindow(resolved?.window ?? null, fullExtent);
  const targetKey = windowKey(target);
  const hasFilter = filter != null;

  useEffect(() => {
    if (fullExtent == null) return;
    if (target != null) {
      anim.zoomToWindow(target);
    } else if (!hasFilter && !anim.isFullExtent) {
      anim.reset();
    }
    // A filter whose interval is still loading holds the current window.
  }, [targetKey, hasFilter, windowKey(fullExtent)]);

  const selectedID = filter?.int_id ?? null;

  const onClickTimescaleInterval: TimescaleClickHandler = useCallback(
    (_evt, data) => {
      const interval = data?.interval;
      if (interval == null) return;
      const id = interval.int_id ?? interval.oid;
      if (id !== selectedID) {
        selectInterval(intervalShortFromTimescale(interval));
        return;
      }
      // Re-clicking the selection zooms out a level. Parent ids come from the
      // API-built tree (pid = parent int_id; 0 for the synthetic root).
      const pid = interval.pid;
      if (pid == null || pid <= 0) {
        clear();
      } else {
        setFilter({ int_id: pid });
      }
    },
    [selectedID, selectInterval, setFilter, clear]
  );

  const timescaleIntervalStyle: IntervalStyleBuilder = useCallback(
    (interval: Interval) => {
      const id = interval.int_id ?? interval.oid;
      if (selectedID != null && id === selectedID) {
        return { fontWeight: "bold" };
      }
      return {};
    },
    [selectedID]
  );

  return {
    window: anim.window,
    isAnimating: anim.isAnimating,
    isFullExtent: anim.isFullExtent,
    resolved,
    onClickTimescaleInterval,
    timescaleIntervalStyle,
  };
}

/** The age extent covered by a set of units (or of column records that carry
 * `units`), as the `fullExtent` for `useTimeFilterWindow`. */
export function ageExtentOfUnits(
  data: Array<{ t_age?: any; b_age?: any; units?: any[] }> | null | undefined
): AgeWindow | null {
  if (data == null) return null;
  let t_age = Infinity;
  let b_age = -Infinity;
  for (const d of data) {
    const units = d.units ?? [d];
    for (const u of units) {
      const t = Number(u.t_age);
      const b = Number(u.b_age);
      if (Number.isFinite(t)) t_age = Math.min(t_age, t);
      if (Number.isFinite(b)) b_age = Math.max(b_age, b);
    }
  }
  if (!Number.isFinite(t_age) || !Number.isFinite(b_age)) return null;
  return { t_age, b_age };
}

// Helpers -------------------------------------------------------------------

function clampWindow(
  window: AgeWindow | null,
  extent: AgeWindow | null
): AgeWindow | null {
  if (window == null) return null;
  if (extent == null) return window;
  const t_age = Math.max(window.t_age, extent.t_age);
  const b_age = Math.min(window.b_age, extent.b_age);
  if (!(b_age > t_age)) return extent;
  return { t_age, b_age };
}

function windowKey(window: AgeWindow | null): string | null {
  if (window == null) return null;
  return `${window.b_age}:${window.t_age}`;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function parseNumber(value: string | null): number | undefined {
  if (value == null || value === "") return undefined;
  const num = parseFloat(value);
  if (!Number.isFinite(num)) return undefined;
  return num;
}

function parseInteger(value: string | null): number | undefined {
  if (value == null || value === "") return undefined;
  const num = parseInt(value, 10);
  if (!Number.isFinite(num)) return undefined;
  return num;
}
