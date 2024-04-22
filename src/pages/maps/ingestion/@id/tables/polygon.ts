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
import IntervalSelection, {
  Interval,
} from "~/pages/maps/ingestion/@id/components/cell/interval-selection";
import { getTableUpdate } from "~/pages/maps/ingestion/@id/table-util";
import CheckboxCell from "~/pages/maps/ingestion/@id/components/cell/checkbox-cell";
import { TableInterface } from "../edit-table";
import styles from "~/pages/maps/ingestion/@id/edit-table.module.sass";
import { COMMON_COLUMNS } from "../tables";
import { toBoolean } from "~/pages/maps/ingestion/@id/components/cell/util";

const h = hyper.styled(styles);

export default function PolygonTable({
  url,
  ingestProcessId,
}: CustomTableProps) {
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

  // Cell Values
  const [intervals, setIntervals] = useState<Interval[]>([]);

  useEffect(() => {
    async function getIntervals() {
      let response = await fetch(
        `https://macrostrat.org/api/defs/intervals?tilescale_id=11`
      );

      if (response.ok) {
        let response_data = await response.json();
        setIntervals(response_data.success.data);
      }
    }

    getIntervals();
  }, []);

  const polygonColumnGenerator = useCallback(
    ({
      url,
      defaultColumnConfig,
      dataParameters,
      setTableUpdates,
      transformedData,
      data,
      ref,
    }: ColumnConfigGenerator): ColumnConfig => {
      return {
        ...defaultColumnConfig,
        t_interval: h(Column, {
          ...defaultColumnConfig["t_interval"].props,
          cellRenderer: (rowIndex: number, columnIndex: number) =>
            h(IntervalSelection, {
              ref: (el) => {
                try {
                  ref.current[rowIndex][columnIndex] = el;
                } catch (e) {}
              },
              intervals: intervals,
              onConfirm: (value) => {
                const tableUpdate = getTableUpdate(
                  url,
                  value,
                  "t_interval",
                  rowIndex,
                  transformedData,
                  dataParameters
                );

                let newTableUpdates = [tableUpdate];

                if (
                  transformedData[rowIndex]["b_interval"] == undefined ||
                  transformedData[rowIndex]["b_interval"] == ""
                ) {
                  let oppositeIntervalTableUpdate = getTableUpdate(
                    url,
                    value,
                    "b_interval",
                    rowIndex,
                    transformedData,
                    dataParameters
                  );

                  newTableUpdates.push(oppositeIntervalTableUpdate);
                }

                setTableUpdates((p) => [...p, ...newTableUpdates]);
              },
              intent:
                data[rowIndex]["t_interval"] !=
                transformedData[rowIndex]["t_interval"]
                  ? "success"
                  : undefined,
              value:
                transformedData.length == 0
                  ? ""
                  : transformedData[rowIndex]["t_interval"],
            }),
        }),
        b_interval: h(Column, {
          ...defaultColumnConfig["b_interval"].props,
          cellRenderer: (rowIndex: number, columnIndex: number) =>
            h(IntervalSelection, {
              ref: (el) => {
                try {
                  ref.current[rowIndex][columnIndex] = el;
                } catch (e) {}
              },
              intervals: intervals,
              onConfirm: (value) => {
                const tableUpdate = getTableUpdate(
                  url,
                  value,
                  "b_interval",
                  rowIndex,
                  transformedData,
                  dataParameters
                );

                let newTableUpdates = [tableUpdate];

                if (
                  transformedData[rowIndex]["t_interval"] == undefined ||
                  transformedData[rowIndex]["t_interval"] == ""
                ) {
                  let oppositeIntervalTableUpdate = getTableUpdate(
                    url,
                    value,
                    "t_interval",
                    rowIndex,
                    transformedData,
                    dataParameters
                  );

                  newTableUpdates.push(oppositeIntervalTableUpdate);
                }

                setTableUpdates((p) => [...p, ...newTableUpdates]);
              },
              intent:
                data[rowIndex]["b_interval"] !=
                transformedData[rowIndex]["b_interval"]
                  ? "success"
                  : undefined,
              value:
                transformedData.length == 0
                  ? ""
                  : transformedData[rowIndex]["b_interval"],
            }),
        }),
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

                setTableUpdates((p) => [...p, tableUpdate]);
              },
              value: toBoolean(transformedData[rowIndex]["omit"]),
            }),
        }),
      };
    },
    [intervals]
  );

  return h(TableInterface, {
    url,
    ingestProcessId,
    finalColumns: FINAL_POLYGON_COLUMNS,
    columnGenerator: polygonColumnGenerator,
  });
}
