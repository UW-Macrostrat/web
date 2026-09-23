/** The focused age window, seen from a sheet: the rows it filters to, and the
 * contextual actions that set it.
 *
 * The window itself belongs to the column (see `./state/focus`) — these are
 * the two places a table meets it. A filter, because narrowing the column
 * should narrow the rows you are editing; and a pair of actions, because the
 * reverse is just as useful: focus what these rows cover, or what their
 * section covers.
 */
import { useEffect, useMemo, useRef } from "react";
import { RegionCardinality } from "@blueprintjs/table";
import {
  type TableAction,
  type TableFilter,
  useStoreAPI,
} from "@macrostrat/data-sheet";
import type { AgeWindow } from "@macrostrat/column-views";
import { ageRangeOf, useFocusAgeRange, useFocusedWindow } from "./state";

const FOCUS_FILTER_ID = "column-focus";

/** A row that can answer where it sits in time: a unit by its extent, a
 * surface by its age. */
export interface AgedRow {
  t_age?: number;
  b_age?: number;
  age?: number;
  section_id?: number | number[] | null;
}

/** Rows within the focused window. A unit overlaps it; a surface sits in it. */
function rowInWindow(row: AgedRow, window: AgeWindow): boolean {
  if (row == null) return false;
  if (row.t_age != null && row.b_age != null) {
    return row.b_age >= window.t_age && row.t_age <= window.b_age;
  }
  if (row.age != null) {
    return row.age >= window.t_age && row.age <= window.b_age;
  }
  // A row with no age at all — a unit on a measured column that carries none —
  // is left in rather than hidden by a filter it can't answer.
  return true;
}

const focusFilter: TableFilter<AgedRow, AgeWindow> = {
  id: FOCUS_FILTER_ID,
  name: "Focused interval",
  icon: "time",
  description: "Rows within the age range the column is focused on",
  describeState: (state) => `${state?.b_age}–${state?.t_age} Ma`,
  predicate: (row, state) => rowInWindow(row, state),
};

/** Keeps a sheet's rows in step with the column's focused window. Rendered
 * inside the sheet, where its store is in scope.
 *
 * It is a real filter, so it shows on the filter bar and can be lifted there —
 * which leaves the column focused, the honest reading: the two are linked, not
 * the same thing. */
export function FocusFilterBridge() {
  const store = useStoreAPI<any>();
  const window = useFocusedWindow();

  useEffect(() => {
    const { setFilter, removeFilter } = store.getState();
    if (window == null) {
      removeFilter(FOCUS_FILTER_ID);
      return;
    }
    setFilter(FOCUS_FILTER_ID, focusFilter, window);
  }, [store, window?.t_age, window?.b_age]);

  return null;
}

/* --------------------------------------------------------------- actions */

export interface FocusActions {
  /** Offered for a row selection, on the sheet as a whole */
  rowAction: TableAction<AgedRow>;
  /** Offered when the selection touches the section column */
  sectionAction: TableAction<AgedRow>;
}

/**
 * "Focus this age range" and "Focus this section".
 *
 * `rows` is the whole set as edited — a row's age range is something the
 * transaction changes, and focusing it should follow what the column is
 * drawing. It is read through a ref so the actions keep one identity: an
 * action array that changed on every keystroke would churn the column spec it
 * is attached to, and with it the sheet's provider.
 *
 * The *selection* is taken as rows rather than indices. A local data provider
 * applies the active filters itself, so the sheet's own rows are already the
 * matching subset and an index into them means nothing in the full set;
 * `resolve` maps a selected row back to its edited counterpart by identity.
 */
export function useFocusActions(
  rows: AgedRow[],
  resolve: (row: any) => AgedRow | null = (row) => row
): FocusActions {
  const focusAgeRange = useFocusAgeRange();
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const resolveRef = useRef(resolve);
  resolveRef.current = resolve;

  return useMemo(() => {
    const selected = (rawRows: any[]) =>
      rawRows.map((d) => resolveRef.current(d)).filter((d) => d != null);

    return {
      rowAction: {
        id: "focus-age-range",
        name: "Focus this age range",
        icon: "zoom-to-fit",
        description:
          "Narrow the column, and these rows, to what the selection covers",
        targets: [RegionCardinality.FULL_ROWS],
        requiresEditable: false,
        run(ctx) {
          focusAgeRange(ageRangeOf(selected(ctx.getSelectedRows())));
        },
      },
      sectionAction: {
        id: "focus-section",
        name: "Focus this section",
        icon: "layers",
        description: "Narrow the column to the whole of this section",
        targets: [RegionCardinality.CELLS, RegionCardinality.FULL_COLUMNS],
        requiresEditable: false,
        run(ctx) {
          const sections = new Set(
            selected(ctx.getSelectedRows()).map((d) => d.section_id)
          );
          if (sections.size === 0) return;
          // The whole section, not only the part a filter is showing: focusing
          // a section means seeing all of it.
          const inSection = rowsRef.current.filter((d) =>
            sections.has(d.section_id)
          );
          focusAgeRange(ageRangeOf(inSection));
        },
      },
    };
  }, [focusAgeRange]);
}
