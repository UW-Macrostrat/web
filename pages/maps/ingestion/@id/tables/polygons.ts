/**
 * Generators for the table columns in the ingestion table
 */

import { useCallback, useEffect, useState } from "react";

import hyper from "@macrostrat/hyper";

import { Column } from "@blueprintjs/table";
import {
  ColumnConfig,
  ColumnConfigGenerator,
  CustomTableProps,
} from "#/maps/ingestion/@id/table";
import IntervalSelection, {
  Interval,
} from "#/maps/ingestion/@id/components/cells/interval-selection";
import CheckboxCell from "#/maps/ingestion/@id/components/cells/checkbox-cell";
import { TableInterface } from "../edit-table";
import styles from "#/maps/ingestion/@id/edit-table.module.sass";
import { COMMON_COLUMNS } from ".";
import { toBoolean } from "#/maps/ingestion/@id/components/cells/util";
import { apiV2Prefix } from "@macrostrat-web/settings";
import { createTableUpdate } from "#/maps/ingestion/@id/utils";

const h = hyper.styled(styles);

export function PolygonsTable({ url, ingestProcessId }: CustomTableProps) {
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
      let response = await fetch(`${apiV2Prefix}/defs/intervals?all`);

      if (response.ok) {
        let response_data = await response.json();
        let data = response_data.success.data;
        data.sort(
          (a: Interval, b: Interval) =>
            b.timescales.length - a.timescales.length
        );
        setIntervals(data);
      }
    }

    getIntervals();
  }, []);

  const polygonColumnGenerator = useCallback(
    ({
      url,
      defaultColumnConfig,
      dataParameters,
      addTableUpdate,
      transformedData,
      data,
      ref,
    }: ColumnConfigGenerator): ColumnConfig => {
      return {
        ...defaultColumnConfig,
        t_interval: h(Column, {
          ...defaultColumnConfig?.["t_interval"]?.props,
          cellRenderer: (rowIndex: number, columnIndex: number) =>
            h(IntervalSelection, {
              ref: (el) => {
                try {
                  ref.current[rowIndex][columnIndex] = el;
                } catch (e) {}
              },
              intervals: intervals,
              onConfirm: (value) => {
                const tableUpdate = createTableUpdate(
                  url,
                  value,
                  "t_interval",
                  transformedData[rowIndex],
                  dataParameters
                );

                let newTableUpdates = [tableUpdate];

                if (
                  transformedData[rowIndex]["b_interval"] == undefined ||
                  transformedData[rowIndex]["b_interval"] == ""
                ) {
                  let oppositeIntervalTableUpdate = createTableUpdate(
                    url,
                    value,
                    "b_interval",
                    transformedData[rowIndex],
                    dataParameters
                  );

                  newTableUpdates.push(oppositeIntervalTableUpdate);
                }

                addTableUpdate(newTableUpdates);
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
          ...defaultColumnConfig?.["b_interval"]?.props,
          cellRenderer: (rowIndex: number, columnIndex: number) =>
            h(IntervalSelection, {
              ref: (el) => {
                try {
                  ref.current[rowIndex][columnIndex] = el;
                } catch (e) {}
              },
              intervals: intervals,
              onConfirm: (value) => {
                const tableUpdate = createTableUpdate(
                  url,
                  value,
                  "b_interval",
                  transformedData[rowIndex],
                  dataParameters
                );

                let newTableUpdates = [tableUpdate];

                if (
                  transformedData[rowIndex]["t_interval"] == undefined ||
                  transformedData[rowIndex]["t_interval"] == ""
                ) {
                  let oppositeIntervalTableUpdate = createTableUpdate(
                    url,
                    value,
                    "t_interval",
                    transformedData[rowIndex],
                    dataParameters
                  );

                  newTableUpdates.push(oppositeIntervalTableUpdate);
                }

                addTableUpdate(newTableUpdates);
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
          ...defaultColumnConfig?.["omit"]?.props,
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
                    transformedData[rowIndex],
                    dataParameters
                  ),
                ]);
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
