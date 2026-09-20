/**
 * The columns a lexicon item is found in, as a list of links.
 *
 * The column *map* and the summary counters beside it (`ColumnsTable`) say how
 * much of the record there is and roughly where; neither gets you to a column.
 * This is the list that does — the stratigraphic pages in particular are a
 * common route into "which columns carry this name".
 *
 * It reads the same `colData` GeoJSON the map already loads (`useLexColumns`),
 * so it costs no extra request. Presentation follows the hierarchy strip: an
 * inline run of tags that wraps, with long runs capped, rather than a table
 * that grows the page.
 */
import hyper from "@macrostrat/hyper";
import styles from "./column-list.module.sass";
import { useMemo, useState } from "react";
import { Tag, TagSize } from "@macrostrat/data-components";
import { MacrostratLink } from "~/components/navigation/MacrostratLink";

const h = hyper.styled(styles);

/** Past this many, the rest wait behind a control. */
const COLUMN_CAP = 24;

export interface LexColumnEntry {
  col_id: number;
  col_name: string;
  col_group: string | null;
  project_id: number | null;
  t_units: number;
}

/** Column entries out of the columns GeoJSON, most-used first. Ties break on
 * name so the order is stable between renders and between items. */
export function columnEntries(colData: any): LexColumnEntry[] {
  const features = colData?.features ?? [];
  const entries: LexColumnEntry[] = features.map((f: any) => {
    const p = f?.properties ?? {};
    return {
      col_id: p.col_id,
      col_name: p.col_name,
      col_group: p.col_group ?? null,
      project_id: p.project_id ?? null,
      t_units: p.t_units ?? 0,
    };
  });
  return entries
    .filter((e) => e.col_id != null)
    .sort((a, b) => {
      if (b.t_units !== a.t_units) return b.t_units - a.t_units;
      return (a.col_name ?? "").localeCompare(b.col_name ?? "");
    });
}

export function LexColumnList({ colData }: { colData: any }) {
  const entries = useMemo(() => columnEntries(colData), [colData]);
  const [expanded, setExpanded] = useState(false);

  if (entries.length === 0) return null;

  let shown = entries;
  let more: any = null;
  if (!expanded && entries.length > COLUMN_CAP) {
    shown = entries.slice(0, COLUMN_CAP);
    more = h(
      "button.text-control",
      { key: "more", type: "button", onClick: () => setExpanded(true) },
      `and ${entries.length - COLUMN_CAP} more…`
    );
  }

  return h("div.lex-column-list", [
    h("h3.column-list-header", { key: "header" }, [
      "Columns",
      h("span.column-count", { key: "count" }, entries.length.toLocaleString()),
    ]),
    h("div.column-run", { key: "run" }, [
      shown.map((entry) => h(ColumnTag, { key: entry.col_id, entry })),
      more,
    ]),
  ]);
}

/** One column: its name, and how many of its units carry this item. */
function ColumnTag({ entry }: { entry: LexColumnEntry }) {
  let details: string | undefined = undefined;
  if (entry.t_units > 0) {
    details = `${entry.t_units.toLocaleString()} ${
      entry.t_units === 1 ? "unit" : "units"
    }`;
  }

  return h(
    MacrostratLink,
    { item: { col_id: entry.col_id }, className: "column-tag" },
    h(Tag, { name: entry.col_name, details, size: TagSize.Small })
  );
}
