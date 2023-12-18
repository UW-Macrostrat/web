import hyper from "@macrostrat/hyper";

import { useState, useEffect, useCallback, useRef, useLayoutEffect, useMemo, FunctionComponent } from "react";
import { HotkeysProvider, InputGroup, Button, useHotkeys } from "@blueprintjs/core";
import { Spinner, ButtonGroup } from "@blueprintjs/core";
import {
  Column,
  Table2,
  EditableCell2,
  RowHeaderCell2,
  ColumnHeaderCell2,
  SelectionModes,
  RegionCardinality
} from "@blueprintjs/table";
import update from "immutability-helper";

import { Filters, OperatorQueryParameter, TableUpdate, TableSelection, Selection, DataParameters } from "~/pages/maps/@id/edit/table";
import {
  buildURL,
  Filter,
  isEmptyArray,
  submitChange,
  getTableUpdate,
  range,
  applyTableUpdate,
  applyTableUpdates,
  submitColumnCopy
} from "~/pages/maps/@id/edit/table-util";
import TableMenu from "~/pages/maps/@id/edit/table-menu";
import IntervalSelection, {Interval} from "./components/cell/interval-selection";
import ProgressPopover, {
  ProgressPopoverProps
} from "~/pages/maps/@id/edit/components/progress-popover/progress-popover";

import "./override.sass"
import "@blueprintjs/table/lib/css/table.css";
import styles from "./edit-table.module.sass";
import { EditableCell } from "~/pages/maps/@id/edit/components/cell/editable-cell";

const h = hyper.styled(styles);

const FINAL_COLUMNS = [
  "source_id",
  "orig_id",
  "descrip",
  "ready",
  "name",
  "strat_name",
  "age",
  "lith",
  "comments",
  "t_interval",
  "b_interval"
]

interface EditTableProps {
  url: string;
}

interface TableState {
  error: string | undefined;
  filters: Filters;
  group: string | undefined;
  tableSelection: TableSelection;
}

export default function TableInterface({ url }: EditTableProps) {

  // Selection State
  const [selectedColumn, setSelectedColumn] = useState<string | undefined>(undefined)
  const [copiedColumn, setCopiedColumn] = useState<string | undefined>(undefined)

  // Data State
  const [dataParameters, setDataParameters] = useState<DataParameters>({select: {page: "0", pageSize: "99"}, filter: {}})
  const [data, setData] = useState<any[]>([])

  // Error State
  const [error, setError] = useState<string | undefined>(undefined)

  // Table Update State
  const [tableUpdates, _setTableUpdates] = useState<TableUpdate[]>([])
  const [updateProgress, setUpdateProgress] = useState<ProgressPopoverProps>(undefined)

  // Cell Values
  const [intervals, setIntervals] = useState<Interval[]>([])

  useEffect(() => {

    async function getIntervals() {
      let response = await fetch(`https://macrostrat.org/api/defs/intervals?tilescale_id=11`)

      if (response.ok) {
        let response_data = await response.json();
        setIntervals(response_data.success.data);
      }
    }

    getIntervals()
  }, [])

  const nonIdColumnNames = useMemo(() => {
    return data.length ? Object.keys(data[0]).filter(x => x != "_pkid") : []
  }, [data])

  const setTableUpdates = useCallback(async (newTableUpdates: TableUpdate[]) => {

    // If the table updates are empty, reset the data
    if (newTableUpdates.length == 0) {
      let newData = await getData(newTableUpdates, dataParameters)
      setData(newData)
    }

    // If a new update is available apply it to the data
    if(newTableUpdates.length > tableUpdates.length){
      let newData = applyTableUpdate(data, newTableUpdates.slice(-1)[0])
      setData(newData)
    }

    _setTableUpdates(newTableUpdates)

  }, [data, tableUpdates, dataParameters])

  const getData = useCallback( async (tableUpdates: TableUpdate[], dataParameters: DataParameters) => {

    const dataURL = buildURL(url, dataParameters)

    const response = await fetch(dataURL)
    let data = await response.json()

    // Apply tableupdates to the data
    data = applyTableUpdates(data, tableUpdates)

    if(data.length == 0){
      setError("Warning: No results matched query")
    } else {

      setError(undefined)
    }

    // Remove the progress bar on data reload
    setUpdateProgress(undefined)

    return data
  }, [])

  // On mount get data
  useEffect(() => {
    (async () => {
      setData(await getData(tableUpdates, dataParameters))
    })()
  }, [dataParameters])

  const handlePaste = useCallback(() => {
    if(copiedColumn != undefined && selectedColumn != undefined){

      const tableUpdate = {
        description: "Copy column " + copiedColumn + " to column " + selectedColumn + " for all rows",
        applyToCell: (value: string, row, cellColumnName) => {

          if(cellColumnName != selectedColumn){
            return value
          }

          // If this row doesn't pass all the filters skip it
          if(dataParameters?.filter != undefined) {
            for (const filter of Object.values(dataParameters.filter)) {
              if (!filter.passes(row)) {
                return value
              }
            }
          }

          if(cellColumnName == selectedColumn){
            return row[copiedColumn]
          }

          return value
        },
        execute: async () => {
          await submitColumnCopy(url, copiedColumn, selectedColumn, dataParameters)
        }
      }

      setTableUpdates([...tableUpdates, tableUpdate])
    }
  }, [selectedColumn, copiedColumn, dataParameters])

  const handleCopy = useCallback(() => {
    setCopiedColumn(selectedColumn)
  }, [selectedColumn])

  const hotkeys = useMemo(() => [
    {
      combo: "cmd+c",
      label: "Copy data",
      onKeyDown: handleCopy,
    },
    {
      combo: "cmd+v",
      label: "Paste Data",
      onKeyDown: handlePaste,
    }
  ], [handlePaste, handleCopy]);
  const { handleKeyDown, handleKeyUp } = useHotkeys(hotkeys);

  const submitTableUpdates = useCallback(async () => {

    setUpdateProgress({value: 0, text: "Submitting changes"})

    let index = 0
    for(const tableUpdate of tableUpdates){

      setUpdateProgress({...updateProgress, text: tableUpdate?.description ?? "Submitting changes"})

      try {
        await tableUpdate.execute()
      } catch (e) {

        setUpdateProgress({
          progressBarProps: { intent: "danger" },
          value: 1,
          text: "Error submitting changes"
        })
        console.error(e)

        setTimeout(() => {
          setUpdateProgress(undefined)
        }, 5000)

        return // If there is an error, stop submitting
      }

      index += 1
      setUpdateProgress({...updateProgress, value: index / tableUpdates.length})
    }

    setTableUpdates([])
  }, [tableUpdates])

  const columnHeaderCellRenderer = useCallback((columnIndex: number) => {

    const columnName: string = nonIdColumnNames[columnIndex]

    const onFilterChange = (param: OperatorQueryParameter) => {
      const columnFilter = new Filter(columnName, param.operator, param.value)
      setDataParameters({...dataParameters, filter: {...dataParameters.filter, [columnName]: columnFilter}})
    }


    let filter = undefined
    if(dataParameters.filter != undefined && dataParameters.filter[columnName] != undefined){
      filter = dataParameters.filter[columnName]
    } else {
      filter = new Filter(columnName, undefined, "")
    }

    const setGroup = (group: string | undefined) => {
      setDataParameters({...dataParameters, group: group})
    }

    return h(ColumnHeaderCell2, {
      menuRenderer: () => h(TableMenu, {"columnName": columnName, "onFilterChange": onFilterChange, "filter": filter, "onGroupChange": setGroup, "group": dataParameters?.group}),
      name: columnName,
      style: {
        backgroundColor: filter.is_valid() || dataParameters?.group == columnName ? "rgba(27,187,255,0.12)" : "#ffffff00"
      }
    }, [])
  }, [dataParameters, data])

  const rowHeaderCellRenderer = useCallback((rowIndex: number) => {

    if (data.length == 0) {
      return h(RowHeaderCell2, { "name": "NULL" }, []);
    }

    const headerKey = dataParameters?.group ? dataParameters?.group : "_pkid"
    let name = data[rowIndex][headerKey]

    if (name == null) {
      name = "NULL";
    } else if(name.length > 47){
      name = name.slice(0, 47) + "..."
    }

    return h(RowHeaderCell2, { "name": name }, []);
  }, [dataParameters, data])

  if(data.length == 0 && error == undefined){
    return h(Spinner)
  }

  const defaultColumnConfig = nonIdColumnNames.reduce((prev, columnName, index) => {
    return {
      ...prev,
      [columnName]: h(Column, {
        name: columnName,
        className: FINAL_COLUMNS.includes(columnName) ? "final-column" : "",
        columnHeaderCellRenderer: columnHeaderCellRenderer,
        cellRenderer: (rowIndex) => h(EditableCell, {
          onConfirm: (value) => {
            const tableUpdate = getTableUpdate(url, value, columnName, rowIndex, data, dataParameters)
            setTableUpdates([...tableUpdates, tableUpdate])
          },
          value: data[rowIndex][columnName]
        }),
        "key": columnName
      })
    }
  }, {})

  const columnConfig = {
    ...defaultColumnConfig,
    "t_interval": h(Column, {
      ...defaultColumnConfig["t_interval"].props,
      cellRenderer: (rowIndex) => h(IntervalSelection, {
        "intervals": intervals,
        onConfirm: (value) => {
          const tableUpdate = getTableUpdate(url, value, "t_interval", rowIndex, data, dataParameters)
          setTableUpdates([...tableUpdates, tableUpdate])
        },
        value:  data[rowIndex]["t_interval"]
      })
    }),
    "b_interval": h(Column, {
      ...defaultColumnConfig["b_interval"].props,
      cellRenderer: (rowIndex) => h(IntervalSelection, {
        "intervals": intervals,
        onConfirm: (value) => {
          const tableUpdate = getTableUpdate(url, value, "b_interval", rowIndex, data, dataParameters)
          setTableUpdates([...tableUpdates, tableUpdate])
        },
        value:  data[rowIndex]["b_interval"]
      })
    })
  }

  return h("div", {
    onKeyDown: handleKeyDown,
    onKeyUp: handleKeyUp,
    tabIndex: 0,
  }, [
    h("div.table-container", {}, [
      h.if(error != undefined)("div.warning", {}, [error]),
      h("div.input-form", {}, [
        h(ButtonGroup, [
          h(
            Button,
            {
              onClick: () => {
                setTableUpdates([]);
              },
              disabled: tableUpdates.length == 0,
            },
            ["Clear changes"]
          ),
          h(
            Button,
            {
              type: "submit",
              onClick: submitTableUpdates,
              disabled: tableUpdates.length == 0,
              intent: "success",
            },
            ["Submit"]
          ),
        ]),
      ]),
      h(
        Table2,
        {
          selectionModes: dataParameters?.group ? RegionCardinality.CELLS : SelectionModes.COLUMNS_AND_CELLS,
          rowHeaderCellRenderer: rowHeaderCellRenderer,
          onSelection: (selections: Selection[]) => {
            const selectedColumns = selections[0]?.cols
            if(selectedColumns[0] == selectedColumns[1] && selections[0]?.rows == undefined){
              setSelectedColumn(nonIdColumnNames[selectedColumns[0]])
            } else {
              setSelectedColumn(undefined)
            }
          },
          numRows: data.length,
          // Dumb hacks to try to get the table to rerender on changes
          cellRendererDependencies: [data, tableUpdates],
        },
        Object.values(columnConfig)
      ),
      h.if(updateProgress != undefined)(
        ProgressPopover,
        {
          progressBarProps: { intent: "success" },
          ...updateProgress
        }
      )
    ]),
  ]);
}


