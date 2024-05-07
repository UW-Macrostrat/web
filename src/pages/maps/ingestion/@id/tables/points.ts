/**
 * Generators for the table columns in the ingestion table
 */

import { useCallback, useEffect, useState } from "react";

import hyper from "@macrostrat/hyper";

import { ColumnProps, Column } from "@blueprintjs/table";
import {
  ColumnConfig,
  ColumnConfigGenerator,
  CustomTableProps,
} from "~/pages/maps/ingestion/@id/table";
import CheckboxCell from "~/pages/maps/ingestion/@id/components/cells/checkbox-cell";
import { TableInterface } from "../edit-table";
import styles from "~/pages/maps/ingestion/@id/edit-table.module.sass";
import { COMMON_COLUMNS } from ".";
import { toBoolean } from "~/pages/maps/ingestion/@id/components/cells/util";
import { createTableUpdate } from "~/pages/maps/ingestion/@id/utils";

const h = hyper.styled(styles);

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
    finalColumns: FINAL_POINT_COLUMNS,
    columnGenerator: pointColumnGenerator,
  });
}
