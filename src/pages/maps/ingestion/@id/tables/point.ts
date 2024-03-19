/**
 * Generators for the table columns in the ingestion table
 */

import { useCallback, useEffect, useState } from "react";

import hyper from "@macrostrat/hyper";


import { ColumnProps, Column } from "@blueprintjs/table";
import {
  ColumnConfig,
  ColumnConfigGenerator,
  CustomTableProps
} from "~/pages/maps/ingestion/@id/table";
import IntervalSelection, { Interval } from "~/pages/maps/ingestion/@id/components/cell/interval-selection";
import { getTableUpdate } from "~/pages/maps/ingestion/@id/table-util";
import CheckboxCell from "~/pages/maps/ingestion/@id/components/cell/checkbox-cell";
import EditTable from "~/pages/maps/ingestion/@id/edit-table";
import styles from "~/pages/maps/ingestion/@id/edit-table.module.sass";
import {COMMON_COLUMNS} from "../tables";

const h = hyper.styled(styles);

export default function PointTable({url, ingestProcessId}: CustomTableProps) {

  const FINAL_POINT_COLUMNS = [
    ...COMMON_COLUMNS,
    "comments",
    "strike",
    "dip",
    "dip_dir",
    "point_type",
    "certainty"
  ]

  const pointColumnGenerator = useCallback(({
   url,
   defaultColumnConfig,
   dataParameters,
   setTableUpdates,
   transformedData,
   data,
   ref
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
              const tableUpdate = getTableUpdate(
                url,
                value,
                "omit",
                rowIndex,
                transformedData,
                dataParameters
              );

              setTableUpdates(p => [...p, tableUpdate]);
            },
            value: transformedData[rowIndex]["omit"],
          }),
      }),
    };
  }, []);

  return h(EditTable, {
    url: url,
    ingestProcessId: ingestProcessId,
    finalColumns: FINAL_POINT_COLUMNS,
    columnGenerator: pointColumnGenerator
  })
}