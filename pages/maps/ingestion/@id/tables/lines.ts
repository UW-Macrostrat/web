/**
 * Generators for the table columns in the ingestion table
 */

import { useCallback } from "react";
import h from "../hyper";

import { Column } from "@blueprintjs/table";
import {
  ColumnConfig,
  ColumnConfigGenerator,
  COMMON_COLUMNS,
  CustomTableProps,
} from "./defs";
import { TableInterface } from "./edit-table";
import { CheckboxCell, toBoolean } from "../components";
import { createTableUpdate } from "../utils";

export function LinesTable({ url, ingestProcessId }: CustomTableProps) {
  const FINAL_LINE_COLUMNS = [
    ...COMMON_COLUMNS,
    "name",
    "descrip",
    "type",
    "direction",
  ];

  const linesColumnGenerator = useCallback(
    ({
      url,
      sharedColumnConfig,
      dataParameters,
      addTableUpdate,
      transformedData,
      ref,
    }: ColumnConfigGenerator): ColumnConfig => {
      return {
        ...sharedColumnConfig,
        omit: h(Column, {
          ...sharedColumnConfig?.["omit"]?.props,
          cellRenderer: (rowIndex: number, columnIndex: number) =>
            h(CheckboxCell, {
              ref: (el) => {
                try {
                  ref.current[rowIndex][columnIndex] = el;
                } catch (e) {}
              },
              onConfirm: (value) => {
                addTableUpdate([
                  createTableUpdate(
                    url,
                    value,
                    "omit",
                    rowIndex,
                    transformedData,
                    dataParameters
                  ),
                ]);
              },
              value: toBoolean(transformedData[rowIndex]["omit"]),
            }),
        }),
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
