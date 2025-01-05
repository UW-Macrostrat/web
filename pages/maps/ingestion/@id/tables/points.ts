/**
 * Generators for the table columns in the ingestion table
 */

import { useCallback } from "react";
import {
  ColumnConfig,
  ColumnConfigGenerator,
  COMMON_COLUMNS,
  CustomTableProps,
} from "./defs";
import { TableInterface } from "./edit-table";
import h from "../hyper";

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
    finalColumns: FINAL_POINT_COLUMNS,
    columnGenerator: pointColumnGenerator,
  });
}
