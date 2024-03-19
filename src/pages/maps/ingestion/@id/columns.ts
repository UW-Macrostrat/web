/**
 * Generators for the table columns in the ingestion table
 */

import hyper from "@macrostrat/hyper";


import { ColumnProps, Column } from "@blueprintjs/table";
import { DataParameters } from "~/pages/maps/ingestion/@id/table";
import IntervalSelection from "~/pages/maps/ingestion/@id/components/cell/interval-selection";
import { getTableUpdate } from "~/pages/maps/ingestion/@id/table-util";
import CheckboxCell from "~/pages/maps/ingestion/@id/components/cell/checkbox-cell";
import styles from "~/pages/maps/ingestion/@id/edit-table.module.sass";

const h = hyper.styled(styles);

type ColumnConfig = {
  [key: string] : ColumnProps
}

interface ColumnConfigGenerator {
  url: string;
  defaultColumnConfig: ColumnConfig;
  tableColumns: string[];
  dataParameters: DataParameters[];
  setTableUpdates: (tableUpdates: any[]) => void;
  transformedData: any[];
  data: any[];
  intervals: any[];
  ref: any;
}

const polygonColumnGenerator = ({
  url,
  defaultColumnConfig,
  tableColumns,
  dataParameters,
  setTableUpdates,
  transformedData,
  data,
  intervals,
  ref
}: ColumnConfigGenerator): ColumnProps[] => {
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

            let newTableUpdates = [tableUpdate]

            if(transformedData[rowIndex]['b_interval'] == undefined || transformedData[rowIndex]['b_interval'] == ""){
              let oppositeIntervalTableUpdate = getTableUpdate(
                url,
                value,
                "b_interval",
                rowIndex,
                transformedData,
                dataParameters
              );

              newTableUpdates.push(oppositeIntervalTableUpdate)
            }

            setTableUpdates(newTableUpdates);
          },
          intent: data[rowIndex]["t_interval"] != transformedData[rowIndex]["t_interval"] ? "success" : undefined,
          value: transformedData.length == 0 ? "" : transformedData[rowIndex]["t_interval"],
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

            let newTableUpdates = [tableUpdate]

            if(transformedData[rowIndex]['t_interval'] == undefined || transformedData[rowIndex]['t_interval'] == ""){
              let oppositeIntervalTableUpdate = getTableUpdate(
                url,
                value,
                "t_interval",
                rowIndex,
                transformedData,
                dataParameters
              );

              newTableUpdates.push(oppositeIntervalTableUpdate)
            }

            setTableUpdates(newTableUpdates);
          },
          intent: data[rowIndex]["b_interval"] != transformedData[rowIndex]["b_interval"] ? "success" : undefined,
          value: transformedData.length == 0 ? "" : transformedData[rowIndex]["b_interval"],
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

            setTableUpdates(tableUpdate);
          },
          value: transformedData[rowIndex]["omit"],
        }),
    }),
  };
}