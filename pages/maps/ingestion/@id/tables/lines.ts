/**
 * Generators for the table columns in the ingestion table
 */

import { useCallback } from "react";
import h from "../hyper";

import {
  ColumnConfig,
  ColumnConfigGenerator,
  COMMON_COLUMNS,
  CustomTableProps,
} from "./defs";
import { TableInterface } from "./edit-table";

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
    finalColumns: FINAL_LINE_COLUMNS,
    columnGenerator: linesColumnGenerator,
  });
}
