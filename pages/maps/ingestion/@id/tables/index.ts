import { CustomTableProps } from "./defs";
import h from "../hyper";
import { TableInterface } from "./edit-table";
import { COMMON_COLUMNS } from "./defs";
import type { ColumnSpec } from "@macrostrat/data-sheet";
import {
  IntervalCell,
  IntervalEditor,
  renderIntervalName,
  useLoadIntervals,
} from "./interval-editor";

/** Column display-name / read-only overrides shared by all feature tables. */
const COMMON_OVERRIDES: Record<string, Partial<ColumnSpec> | string> = {
  orig_id: "Original ID",
  descrip: "Description",
  name: "Name",
  // Grey via a valueRenderer span rather than `style`: data-sheet mutates the
  // shared `col.style` object when styling deleted/omitted rows, which would
  // otherwise strike through the whole column.
  source_layer: {
    name: "Source layer",
    editable: false,
    valueRenderer: (v: any) =>
      h("span", { style: { color: "#8a8a8a" } }, v ?? ""),
  },
};

const INTERVAL_OVERRIDES: Record<string, Partial<ColumnSpec>> = {
  t_interval: {
    name: "Top interval",
    cellComponent: IntervalCell,
    dataEditor: IntervalEditor,
    valueRenderer: renderIntervalName,
    width: 200,
  },
  b_interval: {
    name: "Bottom interval",
    cellComponent: IntervalCell,
    dataEditor: IntervalEditor,
    valueRenderer: renderIntervalName,
    width: 200,
  },
};

export function PolygonsTable({ url, ingestProcessId }: CustomTableProps) {
  useLoadIntervals();

  const FINAL_POLYGON_COLUMNS = [
    ...COMMON_COLUMNS,
    "name",
    "strat_name",
    "age",
    "lith",
    "comments",
    "b_interval",
    "t_interval",
  ];

  return h(TableInterface, {
    url,
    ingestProcessId,
    featureType: "polygon",
    finalColumns: FINAL_POLYGON_COLUMNS,
    overrides: { ...COMMON_OVERRIDES, ...INTERVAL_OVERRIDES },
  });
}

export function LinesTable({ url, ingestProcessId }: CustomTableProps) {
  const FINAL_LINE_COLUMNS = [
    ...COMMON_COLUMNS,
    "name",
    "descrip",
    "type",
    "direction",
  ];

  return h(TableInterface, {
    url,
    ingestProcessId,
    featureType: "line",
    finalColumns: FINAL_LINE_COLUMNS,
    overrides: COMMON_OVERRIDES,
  });
}

export function PointsTable({ url, ingestProcessId }: CustomTableProps) {
  const FINAL_POINT_COLUMNS = [
    ...COMMON_COLUMNS,
    "comments",
    "strike",
    "dip",
    "dip_dir",
    "point_type",
    "certainty",
  ];

  return h(TableInterface, {
    url,
    ingestProcessId,
    featureType: "point",
    finalColumns: FINAL_POINT_COLUMNS,
    overrides: COMMON_OVERRIDES,
  });
}
