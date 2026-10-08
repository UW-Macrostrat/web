import h from "@macrostrat/hyper";
import { ColoredUnitComponent } from "@macrostrat/column-views";

/** Whether a column's units draw in one internal column, overlapping where
 * their ranges do, instead of spreading overlapping units side by side as an
 * age column does. A measured section records one sequence; overlap there is an
 * artifact of ages or depths assigned at core boundaries, not units deposited
 * in parallel. Every eODP hole (project 3) is typed a section. */
export function drawsAsSingleColumn(column: { col_type?: string | null }) {
  return column?.col_type == "section";
}

/** `maxInternalColumns` for `Column`: one for a section, the default else */
export function maxInternalColumnsFor(column: {
  col_type?: string | null;
}): number | undefined {
  if (drawsAsSingleColumn(column)) return 1;
  return undefined;
}

/** Every unit across the column's full width. `Column` gives overlapping units
 * a side-by-side `layout`, and `UnitComponent` (column-views 3.16) takes its
 * column count from that rather than from `maxInternalColumns`, so a section
 * whose cores overlap by a few centimeters still split into two columns. The
 * layout is replaced, not dropped: without one the unit draws 1px wide. */
function FullWidthUnitComponent(props) {
  const division = props.division;
  if (division?.layout == null) return h(ColoredUnitComponent, props);
  const layout = {
    ...division.layout,
    column: 0,
    nColumns: 1,
    totalColumns: 1,
  };
  return h(ColoredUnitComponent, {
    ...props,
    division: { ...division, layout },
  });
}

/** The unit component for a column: full width for a section */
export function unitComponentFor(column: { col_type?: string | null }) {
  if (drawsAsSingleColumn(column)) return FullWidthUnitComponent;
  return ColoredUnitComponent;
}
