/**
 * Generators for the table columns in the ingestion table
 */

import { useCallback, useEffect, useState } from "react";
import { Column } from "@blueprintjs/table";
import {
  ColumnConfig,
  ColumnConfigGenerator,
  COMMON_COLUMNS,
  CustomTableProps,
} from "./defs";
import { IntervalSelection, Interval } from "../components";
import h from "../hyper";
import { TableInterface } from "./edit-table";
import { apiV2Prefix } from "@macrostrat-web/settings";
import { createTableUpdate } from "../utils";

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
      sharedColumnConfig,
      dataParameters,
      addTableUpdate,
      transformedData,
      data,
    }: ColumnConfigGenerator): ColumnConfig => {
      return {
        ...sharedColumnConfig,
        t_interval: h(Column, {
          ...sharedColumnConfig?.["t_interval"]?.props,
          cellRenderer: useIntervalSelectionRenderer(
            IntervalType.TOP,
            data,
            transformedData,
            intervals,
            dataParameters,
            addTableUpdate,
            url
          ),
        }),
        b_interval: h(Column, {
          ...sharedColumnConfig?.["b_interval"]?.props,
          cellRenderer: useIntervalSelectionRenderer(
            IntervalType.BOTTOM,
            data,
            transformedData,
            intervals,
            dataParameters,
            addTableUpdate,
            url
          ),
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
    featureType: "polygon",
  });
}

enum IntervalType {
  TOP = "t_interval",
  BOTTOM = "b_interval",
}

function useIntervalSelectionRenderer(
  type: IntervalType,
  data,
  transformedData,
  intervals,
  dataParameters,
  addTableUpdate,
  url
) {
  let currentInterval: string;
  let oppInterval: string;

  if (type == IntervalType.TOP) {
    currentInterval = "t_interval";
    oppInterval = "b_interval";
  } else if (type == IntervalType.BOTTOM) {
    currentInterval = "b_interval";
    oppInterval = "t_interval";
  }

  return (rowIndex: number, columnIndex: number) => {
    const cellValue = transformedData[rowIndex][currentInterval];
    let cellValueOpp = transformedData[rowIndex][oppInterval];
    if (cellValueOpp == "") {
      cellValueOpp = null;
    }

    return h(IntervalSelection, {
      intervals: intervals,
      onConfirm: (value) => {
        let newTableUpdates = [
          createTableUpdate(
            url,
            value,
            currentInterval,
            transformedData[rowIndex],
            dataParameters
          ),
        ];

        if (cellValueOpp == null) {
          // If the opposite interval is empty, set it to the same value
          newTableUpdates.push(
            createTableUpdate(
              url,
              value,
              oppInterval,
              transformedData[rowIndex],
              dataParameters
            )
          );
        }

        addTableUpdate(newTableUpdates);
      },
      intent:
        data[rowIndex][currentInterval] != cellValue ? "success" : undefined,
      value: transformedData.length == 0 ? "" : cellValue,
    });
  };
}
