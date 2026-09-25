/** Interval definitions, so a typed interval name can be resolved to a span of
 * time and a chronostratigraphic edit can move the column rather than only
 * record a value.
 *
 * Not `useMacrostratDefs("intervals")`: that hook skips its fetch whenever the
 * store already holds *some* intervals, and the surface labels put a partial
 * map there (only the ones this column is calibrated against). Editing `b_int`
 * means naming an interval the column doesn't use yet, so the fetch has to be
 * asked for directly. The store's own `fetchedAll` flag keeps repeat calls
 * free. */
import { useEffect } from "react";
import { useMacrostratStore } from "@macrostrat/data-provider";
import type { IntervalDef } from "../boundaries";

export function useIntervalDefs(): Map<number, IntervalDef> | null {
  const intervals = useMacrostratStore((state) => state.intervals);
  const getIntervals = useMacrostratStore((state) => state.getIntervals);
  useEffect(() => {
    getIntervals?.(null, null);
  }, [getIntervals]);
  return intervals ?? null;
}
