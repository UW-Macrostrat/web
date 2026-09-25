/** What part of the column is in focus, and how to move it there.
 *
 * Clicking a timescale interval narrows the rendered age window, animating to
 * it; the tables follow, filtered to the rows that window shows. One thing is
 * being said in two places, so it is held once — `useTimescaleZoom` from
 * `@macrostrat/column-views`, mounted above every pane and read through this
 * context rather than duplicated per pane.
 *
 * A context rather than an atom because the zoom *is* a hook: it owns an
 * animation and a drill path through the timescale, and reimplementing that
 * over jotai would be rebuilding the library's own machinery again.
 */
import h from "@macrostrat/hyper";
import { useAtomValue } from "jotai";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import {
  type AgeWindow,
  type TimescaleZoom,
  unitsAgeExtent,
  useTimescaleZoom,
} from "@macrostrat/column-views";
import { editedUnitsAtom } from "./column";
import { columnScaleOptionsAtom } from "./options";

/** How many timescale levels are drawn at once (the library's default is 3). */
const TIMESCALE_LEVEL_WINDOW = 4;

const ColumnFocusContext = createContext<TimescaleZoom | null>(null);

export function ColumnFocusProvider({ children }: { children: ReactNode }) {
  const units = useAtomValue(editedUnitsAtom);
  const { isPositionAxis } = useAtomValue(columnScaleOptionsAtom);
  const fullExtent = useMemo(() => unitsAgeExtent(units), [units]);

  // A measured column is drawn on metres, not time, so an age window has
  // nothing to narrow. The hook still runs — it reports itself disabled rather
  // than changing hook order.
  //
  // Four levels at once rather than the default three: at rest that reaches
  // era through age, so the fine intervals are on screen to be clicked
  // instead of appearing only once you have already drilled past them.
  const zoom = useTimescaleZoom({
    fullExtent,
    enabled: !isPositionAxis,
    levelWindow: TIMESCALE_LEVEL_WINDOW,
  });

  return h(ColumnFocusContext.Provider, { value: zoom }, children);
}

export function useColumnFocus(): TimescaleZoom | null {
  return useContext(ColumnFocusContext);
}

/** The window the tables should be filtered to: the focused one, or `null`
 * for the whole column. Held back while the zoom animates, so the rows aren't
 * re-filtered on every frame of it. */
export function useFocusedWindow(): AgeWindow | null {
  const zoom = useColumnFocus();
  const window = zoom?.window ?? null;
  const settled = zoom != null && !zoom.isAnimating && !zoom.isFullExtent;
  return useMemo(() => {
    if (!settled) return null;
    return window;
  }, [settled, window?.t_age, window?.b_age]);
}

/** Focus an age range that isn't a timescale interval — a unit's extent, a
 * section's, a surface's neighbourhood.
 *
 * `useTimescaleZoom` drills through intervals, so it is handed one: an
 * interval-shaped object standing for the range, with no level, which leaves
 * the timescale's own level window where it is. It has no `oid` in any
 * timescale, so nothing is drawn as selected — right, because what is focused
 * is a row, not an interval. */
export function useFocusAgeRange() {
  const zoom = useColumnFocus();
  return useCallback(
    (window: AgeWindow | null, name?: string) => {
      if (zoom == null || !zoom.enabled) return;
      if (window == null) {
        zoom.reset();
        return;
      }
      zoom.zoomToInterval({
        oid: `focus:${window.b_age}-${window.t_age}`,
        nam: name,
        lvl: null,
        eag: window.b_age,
        lag: window.t_age,
      } as any);
    },
    [zoom]
  );
}

/** The age range spanned by a set of rows carrying `t_age`/`b_age`. */
export function ageRangeOf(
  rows: { t_age?: number; b_age?: number }[] | null | undefined
): AgeWindow | null {
  const ages = (rows ?? []).filter(
    (d) =>
      d?.t_age != null && d?.b_age != null && !isNaN(d.t_age) && !isNaN(d.b_age)
  );
  if (ages.length === 0) return null;
  return {
    t_age: Math.min(...ages.map((d) => d.t_age)),
    b_age: Math.max(...ages.map((d) => d.b_age)),
  };
}
