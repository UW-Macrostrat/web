/**
 * Generators for the table columns in the ingestion table
 */

import { useCallback } from "react";

import hyper from "@macrostrat/hyper";

import { Column } from "@blueprintjs/table";
import {
  ColumnConfig,
  ColumnConfigGenerator,
  CustomTableProps,
} from "~/pages/maps/ingestion/@id/table";
import CheckboxCell from "~/pages/maps/ingestion/@id/components/cells/checkbox-cell";
import { TableInterface } from "../edit-table";
import styles from "../edit-table.module.sass";
import { COMMON_COLUMNS } from ".";
import { toBoolean } from "../components/cells/util";
import { createTableUpdate } from "~/pages/maps/ingestion/@id/utils";

const h = hyper.styled(styles);

export function LinesTable({ url, ingestProcessId }: CustomTableProps) {
  const FINAL_LINE_COLUMNS = [
    ...COMMON_COLUMNS,
    "name",
    "descrip",
    "type",
    "direction",
  ];

  const linestringColumnGenerator = useCallback(
    ({
      url,
      defaultColumnConfig,
      dataParameters,
       addTableUpdate,
      transformedData,
      ref,
    }: ColumnConfigGenerator): ColumnConfig => {
      return {
        ...defaultColumnConfig,
        omit: h(Column, {
          ...defaultColumnConfig["omit"].props,
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
                  )
                ])
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
    columnGenerator: linestringColumnGenerator,
  });
}
