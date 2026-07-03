/**
 * Column header for the ingestion data-sheet: shows the column name, a star for
 * "final" (harmonized) columns, and active sort / filter / group indicator
 * icons. The actual sort/filter/group/hide controls live in the "Column
 * controls" strip (see `column-controls.ts`), shown when a column is selected.
 */
import { ColumnHeaderCell } from "@blueprintjs/table";
import { Icon } from "@blueprintjs/core";
import { useAtomValue } from "jotai";
import { filtersAtom, groupAtom, sortAtom } from "./state";
import h from "../hyper";

/** Build a data-sheet `columnHeaderCellRenderer` closed over the set of
 * "final" (harmonized) columns, which get a star indicator. */
export function makeColumnHeaderRenderer(finalColumns: string[]) {
  const finalSet = new Set(finalColumns);
  return ({ col }: { col: { key: string; name: string } }) =>
    h(ColumnHeaderCell, {
      name: col.name,
      // A subtle tinted header marks final / harmonized columns (styled via the
      // global `.final-column-header` rule).
      className: finalSet.has(col.key) ? "final-column-header" : undefined,
      nameRenderer: () =>
        h(IngestHeaderName, { columnKey: col.key, name: col.name }),
    });
}

function IngestHeaderName({
  columnKey,
  name,
}: {
  columnKey: string;
  name: string;
}) {
  const sort = useAtomValue(sortAtom);
  const filters = useAtomValue(filtersAtom);
  const group = useAtomValue(groupAtom);

  const hasSort = sort?.key === columnKey;
  const hasFilter = filters[columnKey]?.is_valid() === true;
  const isGrouped = group === columnKey;

  return h("div.ingest-column-header", [
    h("span.column-name", name),
    h.if(hasSort || hasFilter || isGrouped)("span.column-indicators", [
      h.if(hasSort)(Icon, {
        icon: sort?.ascending ? "sort-asc" : "sort-desc",
        size: 12,
      }),
      h.if(hasFilter)(Icon, { icon: "filter", size: 12 }),
      h.if(isGrouped)(Icon, { icon: "group-objects", size: 12 }),
    ]),
  ]);
}
