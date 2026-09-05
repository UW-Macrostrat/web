/** Shared time (age) filter for Macrostrat's column, correlation and map
 * pages.
 *
 * The filter is a small, URL-friendly record using the Macrostrat API's own
 * vocabulary — `int_id`, `t_int_id`/`b_int_id`, `t_age`/`b_age`, `age` — so
 * that every time-filtered page can be linked to the same way, and a filter
 * reads as an API query. Storage is deliberately *not* decided here: a page
 * supplies the atom that backs the filter (a hash-param atom on the column
 * page, a query-param atom elsewhere) through `TimeFilterProvider`, and the
 * hooks and components in this module only ever talk to that atom.
 *
 * Two kinds of selection, mutually exclusive:
 *
 *  - **by interval** — one interval (`int_id`) or a range of intervals
 *    (`t_int_id` the younger, `b_int_id` the older). The rendered window is the
 *    interval span *plus* a margin of the neighboring rock (`windowPadding`),
 *    since the interval is a named thing you're looking at in context.
 *  - **by age** — explicit bounds (`t_age`, `b_age`, either may be open) clip
 *    exactly to what was typed, with no margin. A single `age` focuses on that
 *    moment, shown with the margin so there is something to see.
 *
 * Choosing one kind drops the other.
 */
import { atom, useAtom, useAtomValue, useSetAtom, WritableAtom } from "jotai";
import h from "@macrostrat/hyper";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  Interval,
  IntervalStyleBuilder,
  TimescaleClickHandler,
} from "@macrostrat/timescale";
import {
  intervalShortFromTimescale,
  useAnimatedAgeWindow,
  type AgeWindow,
} from "@macrostrat/column-views";
import type { IntervalShort } from "@macrostrat/data-components";
import { useMacrostratStore } from "@macrostrat/data-provider";
import type { MacrostratInterval } from "@macrostrat/api-types";

/** The time filter as it appears in a URL. All keys optional; a filter with
 * none is `null`. Ages are in Ma, `t_` the younger bound and `b_` the older. */
export interface TimeFilterParams {
  /** A single interval. */
  int_id?: number;
  /** A range of intervals: the younger and older ends. */
  t_int_id?: number;
  b_int_id?: number;
  /** Explicit age bounds. */
  t_age?: number;
  b_age?: number;
  /** A single age to focus on. */
  age?: number;
}

export type TimeFilterAtom = WritableAtom<
  TimeFilterParams | null,
  [TimeFilterParams | null],
  void
>;

export const TIME_FILTER_KEYS = [
  "int_id",
  "t_int_id",
  "b_int_id",
  "t_age",
  "b_age",
  "age",
] as const;

export type TimeFilterKey = (typeof TIME_FILTER_KEYS)[number];

const INTERVAL_KEYS: TimeFilterKey[] = ["int_id", "t_int_id", "b_int_id"];
const INTEGER_KEYS = new Set<TimeFilterKey>(INTERVAL_KEYS);

export type TimeFilterKind = "interval" | "age-range" | "age";

/** Which kind of selection a filter is, or `null` for none. */
export function timeFilterKind(
  filter: TimeFilterParams | null
): TimeFilterKind | null {
  if (filter == null) return null;
  if (INTERVAL_KEYS.some((k) => filter[k] != null)) return "interval";
  if (filter.age != null) return "age";
  if (filter.t_age != null || filter.b_age != null) return "age-range";
  return null;
}

/** A filter resolved against interval definitions, ready to render. */
export interface ResolvedTimeFilter {
  kind: TimeFilterKind;
  /** The window before padding, or `null` while an interval definition loads. */
  window: AgeWindow | null;
  /** For an interval selection: the single interval, or `null` for a range. */
  interval: IntervalShort | null;
  /** For a range: the younger and older intervals (`null` while loading). */
  intervalRange: { top: IntervalShort; bottom: IntervalShort } | null;
  /** Whether the rendered window should show a margin past the bounds. */
  isPadded: boolean;
}

// URL serialization ---------------------------------------------------------

export function parseTimeFilterParams(
  params: URLSearchParams
): TimeFilterParams | null {
  const out: TimeFilterParams = {};
  for (const key of TIME_FILTER_KEYS) {
    const raw = params.get(key);
    let value: number | undefined;
    if (INTEGER_KEYS.has(key)) {
      value = parseInteger(raw);
    } else {
      value = parseNumber(raw);
    }
    if (value != null) out[key] = value;
  }
  return normalizeTimeFilter(out);
}

/** String values for the filter's URL keys. Unset keys are `undefined` so a
 * caller merging into an existing params object drops them. */
export function timeFilterToParams(
  filter: TimeFilterParams | null
): Record<TimeFilterKey, string | undefined> {
  const f = filter ?? {};
  const out = {} as Record<TimeFilterKey, string | undefined>;
  for (const key of TIME_FILTER_KEYS) {
    out[key] = f[key]?.toString();
  }
  return out;
}

/** Drop unset keys and enforce the kind exclusivity (an interval selection
 * wins over stray ages), returning `null` for an empty filter. */
export function normalizeTimeFilter(
  filter: TimeFilterParams | null | undefined
): TimeFilterParams | null {
  if (filter == null) return null;
  const out: TimeFilterParams = {};
  for (const key of TIME_FILTER_KEYS) {
    const value = filter[key];
    if (isFiniteNumber(value)) out[key] = value;
  }
  const hasInterval = INTERVAL_KEYS.some((k) => out[k] != null);
  if (hasInterval) {
    delete out.t_age;
    delete out.b_age;
    delete out.age;
    // A single interval and a range are the same kind of thing; keep one form.
    if (out.int_id != null) {
      delete out.t_int_id;
      delete out.b_int_id;
    } else if (out.t_int_id != null && out.t_int_id === out.b_int_id) {
      out.int_id = out.t_int_id;
      delete out.t_int_id;
      delete out.b_int_id;
    }
  } else if (out.age != null) {
    delete out.t_age;
    delete out.b_age;
  }
  if (Object.keys(out).length === 0) return null;
  return out;
}

export function timeFiltersEqual(
  a: TimeFilterParams | null,
  b: TimeFilterParams | null
): boolean {
  if (a == null || b == null) return a == b;
  return TIME_FILTER_KEYS.every((k) => a[k] == b[k]);
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

/** The timescale `Interval` → `IntervalShort` adapter now ships with
 * `@macrostrat/column-views` (3.11); re-exported so page code keeps one import. */
export { intervalShortFromTimescale };

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
  kind: TimeFilterKind | null;
  setFilter(filter: TimeFilterParams | null): void;
  clear(): void;
  /** Select an interval (its full span, with a margin). */
  selectInterval(interval: IntervalShort): void;
  /** Select a range of intervals; order doesn't matter. */
  selectIntervalRange(a: IntervalShort, b: IntervalShort): void;
  /** Clip to explicit ages (either bound may be open). Drops any interval. */
  setAgeRange(range: { t_age?: number | null; b_age?: number | null }): void;
  /** Focus on a single age. Drops any interval. */
  setAge(age: number | null): void;
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

  const selectIntervalRange = useCallback(
    (a: IntervalShort, b: IntervalShort) => {
      remember(a);
      remember(b);
      // The younger interval is the top of the range
      let top = a;
      let bottom = b;
      if (a.t_age > b.t_age) {
        top = b;
        bottom = a;
      }
      setRaw(normalizeTimeFilter({ t_int_id: top.id, b_int_id: bottom.id }));
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

  const setAge = useCallback(
    (age: number | null) => {
      setRaw(normalizeTimeFilter({ age: age ?? undefined }));
    },
    [setRaw]
  );

  return {
    filter,
    kind: timeFilterKind(filter),
    setFilter,
    clear,
    selectInterval,
    selectIntervalRange,
    setAgeRange,
    setAge,
  };
}

/** Resolve the current filter to a render window and its interval(s). */
export function useResolvedTimeFilter(): ResolvedTimeFilter | null {
  const filter = useAtomValue(useTimeFilterAtom());
  const kind = timeFilterKind(filter);
  const single = useIntervalShort(filter?.int_id ?? null);
  const top = useIntervalShort(filter?.t_int_id ?? null);
  const bottom = useIntervalShort(filter?.b_int_id ?? null);
  if (filter == null || kind == null) return null;

  if (kind === "age-range") {
    return {
      kind,
      // An open bound is left for the caller to fill from the data extent.
      window: { t_age: filter.t_age ?? 0, b_age: filter.b_age ?? Infinity },
      interval: null,
      intervalRange: null,
      isPadded: false,
    };
  }

  if (kind === "age") {
    return {
      kind,
      window: { t_age: filter.age, b_age: filter.age },
      interval: null,
      intervalRange: null,
      isPadded: true,
    };
  }

  // Interval selection: a single interval, or a range whose ends may each be
  // missing (an open range degrades to the interval that is there).
  if (filter.int_id != null) {
    let window: AgeWindow | null = null;
    if (single != null) {
      window = { t_age: single.t_age, b_age: single.b_age };
    }
    return { kind, window, interval: single, intervalRange: null, isPadded: true };
  }

  const ends = [top, bottom].filter((d) => d != null) as IntervalShort[];
  const wanted = [filter.t_int_id, filter.b_int_id].filter((d) => d != null);
  if (ends.length < wanted.length) {
    // Still resolving one end
    return { kind, window: null, interval: null, intervalRange: null, isPadded: true };
  }
  if (ends.length === 1) {
    const only = ends[0];
    return {
      kind,
      window: { t_age: only.t_age, b_age: only.b_age },
      interval: only,
      intervalRange: null,
      isPadded: true,
    };
  }
  return {
    kind,
    window: {
      t_age: Math.min(top.t_age, bottom.t_age),
      b_age: Math.max(top.b_age, bottom.b_age),
    },
    interval: null,
    intervalRange: { top, bottom },
    isPadded: true,
  };
}

export interface TimeFilterWindowOptions {
  /** The full data extent (the window with no filter). `null` until known. */
  fullExtent: AgeWindow | null;
  duration?: number;
  /** Pixels of neighboring column revealed past an interval selection's
   * bounds (the library's `windowPadding`). Explicit ages get none. */
  intervalPadding?: number;
}

export interface TimeFilterWindow {
  /** The animated window to hand to `t_age`/`b_age` column props. */
  window: AgeWindow | null;
  /** Where the animation is heading: the filter's window clamped to the data
   * extent, or the full extent when unfiltered. Stable through a transition,
   * so layout decisions (unit density) can key on it without per-frame churn. */
  targetWindow: AgeWindow | null;
  /** `windowPadding` for the column: the margin for interval selections, zero
   * for explicit ages. */
  windowPadding: number;
  isAnimating: boolean;
  isFullExtent: boolean;
  resolved: ResolvedTimeFilter | null;
  /** Timescale click handler: click an interval to select it; re-click the
   * selected interval to step out to its parent (clearing at the top);
   * shift-click with an interval selected to make a range. */
  onClickTimescaleInterval: TimescaleClickHandler;
  /** Bolds the selected interval(s) on the timescale. */
  timescaleIntervalStyle: IntervalStyleBuilder;
}

/** Drive a column or correlation chart's age window from the shared filter,
 * animating between targets with `useAnimatedAgeWindow`. */
export function useTimeFilterWindow(
  options: TimeFilterWindowOptions
): TimeFilterWindow {
  const { fullExtent, duration, intervalPadding = 24 } = options;
  const { filter } = useTimeFilter();
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

  const { onClickTimescaleInterval, timescaleIntervalStyle } =
    useTimescaleIntervalInteraction();

  let targetWindow = target;
  if (targetWindow == null && !hasFilter) {
    targetWindow = fullExtent;
  }

  let windowPadding = 0;
  if (resolved?.isPadded) {
    windowPadding = intervalPadding;
  }

  return {
    window: anim.window,
    targetWindow,
    windowPadding,
    isAnimating: anim.isAnimating,
    isFullExtent: anim.isFullExtent,
    resolved,
    onClickTimescaleInterval,
    timescaleIntervalStyle,
  };
}

/** Interval navigation on a timescale (a column's own, or a picker): click to
 * select, re-click the selection to step out to its parent, shift-click to
 * extend the selection to a range. Shared by the column and the panel. */
export function useTimescaleIntervalInteraction(): {
  onClickTimescaleInterval: TimescaleClickHandler;
  timescaleIntervalStyle: IntervalStyleBuilder;
} {
  const { filter, selectInterval, selectIntervalRange, setFilter, clear } =
    useTimeFilter();
  const resolved = useResolvedTimeFilter();

  const selectedIDs = useMemo(() => {
    const ids = new Set<number>();
    for (const key of INTERVAL_KEYS) {
      const id = filter?.[key];
      if (id != null) ids.add(id);
    }
    return ids;
  }, [filter?.int_id, filter?.t_int_id, filter?.b_int_id]);

  // The interval a shift-click extends from: the single selection, or the end
  // of a range farther from the clicked interval.
  const anchorFor = useCallback(
    (clicked: IntervalShort): IntervalShort | null => {
      if (resolved?.interval != null) return resolved.interval;
      const range = resolved?.intervalRange;
      if (range == null) return null;
      if (clicked.t_age < range.top.t_age) return range.bottom;
      return range.top;
    },
    [resolved]
  );

  const onClickTimescaleInterval: TimescaleClickHandler = useCallback(
    (evt, data) => {
      const interval = data?.interval;
      if (interval == null) return;
      const short = intervalShortFromTimescale(interval);
      const shiftKey = (evt as any)?.shiftKey === true;

      if (shiftKey) {
        const anchor = anchorFor(short);
        if (anchor != null && anchor.id !== short.id) {
          selectIntervalRange(anchor, short);
          return;
        }
      }

      if (!selectedIDs.has(short.id) || selectedIDs.size > 1) {
        selectInterval(short);
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
    [selectedIDs, anchorFor, selectInterval, selectIntervalRange, setFilter, clear]
  );

  const timescaleIntervalStyle: IntervalStyleBuilder = useCallback(
    (interval: Interval) => {
      const id = interval.int_id ?? interval.oid;
      if (selectedIDs.has(id)) {
        return { fontWeight: "bold" };
      }
      return {};
    },
    [selectedIDs]
  );

  return { onClickTimescaleInterval, timescaleIntervalStyle };
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

export interface TargetUnitHeightOptions {
  /** Height per unit at full extent — the library default. */
  base?: number;
  /** Ceiling, so a window showing one or two units doesn't balloon. */
  max?: number;
  /** Column height the visible units should share out between them. */
  fillHeight?: number;
  /** Growth of the vertical scale as the window narrows: the target is
   * multiplied by `(extent / window) ^ zoomExponent`, so filtering to an
   * interval expands the scale slightly rather than keeping density constant.
   * `0` disables. */
  zoomExponent?: number;
  /** Cap on that zoom-driven growth factor. */
  maxZoomFactor?: number;
}

/** Units of a column (or of each column in a set) that overlap an age window. */
export function countUnitsInWindow(
  units: Array<{ t_age?: any; b_age?: any }> | null | undefined,
  window: AgeWindow | null
): number {
  if (units == null || window == null) return 0;
  let n = 0;
  for (const u of units) {
    const t = Number(u.t_age);
    const b = Number(u.b_age);
    if (!Number.isFinite(t) || !Number.isFinite(b)) continue;
    if (b > window.t_age && t < window.b_age) n += 1;
  }
  return n;
}

/** A dynamic-scale `targetUnitHeight` for a render window.
 *
 * The library sizes every visible unit at `targetUnitHeight` regardless of how
 * far in the window is, so a filter pans and contracts at constant density.
 * Two adjustments make a narrower window read as a closer look:
 *
 * - the target grows with the zoom ratio (`zoomExponent`), gently — a quarter
 *   power means a 16× narrower window draws units twice as tall;
 * - with only a few units on screen, they share `fillHeight` between them
 *   instead of huddling at the top of an otherwise empty column.
 *
 * Bounded by `base` (the full extent keeps the default) and `max`. */
export function targetUnitHeightForWindow(
  count: number,
  window: AgeWindow | null,
  fullExtent: AgeWindow | null,
  options: TargetUnitHeightOptions = {}
): number {
  const {
    base = 20,
    max = 120,
    fillHeight = 600,
    zoomExponent = 0.25,
    maxZoomFactor = 2,
  } = options;

  let zoomFactor = 1;
  if (window != null && fullExtent != null && zoomExponent > 0) {
    const ratio = duration(fullExtent) / duration(window);
    if (Number.isFinite(ratio) && ratio > 1) {
      zoomFactor = Math.min(maxZoomFactor, Math.pow(ratio, zoomExponent));
    }
  }

  let target = base * zoomFactor;
  if (count > 0) {
    target = Math.max(target, fillHeight / count);
  }
  return Math.round(Math.min(max, Math.max(base, target)));
}

/** `targetUnitHeightForWindow` for a flat unit list or a set of column records
 * carrying `units` (the densest column sets the count). */
export function useTargetUnitHeight(
  data: Array<{ t_age?: any; b_age?: any; units?: any[] }> | null | undefined,
  window: AgeWindow | null,
  fullExtent: AgeWindow | null,
  options: TargetUnitHeightOptions = {}
): number {
  const { base, max, fillHeight, zoomExponent, maxZoomFactor } = options;
  return useMemo(() => {
    const opts = { base, max, fillHeight, zoomExponent, maxZoomFactor };
    if (data == null || window == null) {
      return targetUnitHeightForWindow(0, window, fullExtent, opts);
    }
    let count = 0;
    let flat: Array<{ t_age?: any; b_age?: any }> = [];
    for (const d of data) {
      if (Array.isArray(d.units)) {
        count = Math.max(count, countUnitsInWindow(d.units, window));
      } else {
        flat.push(d);
      }
    }
    count = Math.max(count, countUnitsInWindow(flat, window));
    return targetUnitHeightForWindow(count, window, fullExtent, opts);
  }, [
    data,
    windowKey(window),
    windowKey(fullExtent),
    base,
    max,
    fillHeight,
    zoomExponent,
    maxZoomFactor,
  ]);
}

function duration(window: AgeWindow): number {
  return Math.abs(window.b_age - window.t_age);
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
  // A single age (zero-width window) is a valid target; the padding around it
  // is what gets drawn. Anything else inverted falls back to the extent.
  if (b_age < t_age) return extent;
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
