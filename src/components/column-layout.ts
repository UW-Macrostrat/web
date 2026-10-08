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
