import { useCallback } from "react";
import { CustomTableProps } from "./defs";
import h from "../hyper";
import { TableInterface } from "./edit-table";
import { ColumnConfig, ColumnConfigGenerator, COMMON_COLUMNS } from "./defs";

export function PolygonsTable({ url }: CustomTableProps) {
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
    featureType: "polygon",
    columns: FINAL_POLYGON_COLUMNS,
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

  const linesColumnGenerator = useCallback(
    ({ sharedColumnConfig }: ColumnConfigGenerator): ColumnConfig => {
      return {
        ...sharedColumnConfig,
      };
    },
    []
  );

  return h(TableInterface, {
    url: url,
    ingestProcessId: ingestProcessId,
    columns: FINAL_LINE_COLUMNS,
    columnGenerator: linesColumnGenerator,
    featureType: "line",
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

  const pointColumnGenerator = useCallback(
    ({ sharedColumnConfig }: ColumnConfigGenerator): ColumnConfig => {
      return sharedColumnConfig;
    },
    []
  );

  return h(TableInterface, {
    url: url,
    ingestProcessId: ingestProcessId,
    columns: FINAL_POINT_COLUMNS,
    columnGenerator: pointColumnGenerator,
    featureType: "point",
  });
}
