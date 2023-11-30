import hyper from "@macrostrat/hyper";



import { useState, useEffect, useCallback, useRef, useLayoutEffect, useMemo } from "react";
import { HotkeysProvider, InputGroup, Button } from "@blueprintjs/core";
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

import { Filters, OperatorQueryParameter, TableUpdate, TableSelection, Selection } from "~/pages/maps/@id/edit/table";
import { buildURL, Filter, isEmptyArray, submitChange, getTableUpdate } from "~/pages/maps/@id/edit/table-util";
import TableMenu from "~/pages/maps/@id/edit/table-menu";
import ProgressPopover from "~/pages/maps/@id/edit/components/progress-popover/progress-popover";

import "./override.sass"
import "@blueprintjs/table/lib/css/table.css";
import styles from "./edit-table.module.sass";

const h = hyper.styled(styles);

const range = (start, stop, step = 1) =>
  Array(Math.ceil((stop - start) / step))
    .fill(start)
    .map((x, y) => x + y * step);

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

export default function EditTable({ url }) {

  // Table values
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(999999);
  const [totalCount, setTotalCount] = useState(0);

  const [data, setData] = useState<any[]>([]);
  const [dataToggle, setDataToggle] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>(undefined)
  const [filters, setFilters] = useState<Filters>({})
  const [group, setGroup] = useState<string | undefined>(undefined)
  const [tableSelection, setTableSelection] = useState<TableSelection>({columns: [], filter: new Filter("_pkid", "in", "")})
  const [tableUpdates, setTableUpdates] = useState<TableUpdate[]>([])
  const [updateProgress, setUpdateProgress] = useState<number | undefined>(undefined)

  // Sparse array to hold edited data
  const [editedData, setEditedData] = useState(new Array());

  // Memoize non-id columns
  const nonIdColumns = useMemo(() => {
    return data.length ? Object.keys(data[0]).filter(x => x != "_pkid") : []
  }, [data])

  const onChange = (column, row, text) => {

    let rowSpec = {};
    if (text == data[row][column] || (text == "" && data[row][column] == null)) {
      rowSpec = { $unset: [column] };
    } else {
      const rowOp = editedData[row] == null ? "$set" : "$merge";
      rowSpec = { [rowOp]: { [column]: text } };
    }

    const newData = update(editedData, {
      [row]: rowSpec,
    });
    setEditedData(newData);
  };

  const isValid = (key, row, text) => {
    // Placeholder for future validation
    return true;
  };

  const intentForCell = (key, row) => {
    const _val = editedData[row]?.[key];
    if (_val != null) {
      return isValid(key, row, _val) ? "success" : "danger";
    }
    return "none";
  };

  const columnHeaderCellRenderer = (columnIndex: number) => {

    const columnName: string = nonIdColumns[columnIndex]

    const onFilterChange = (param: OperatorQueryParameter) => {

      const columnFilter = new Filter(columnName, param.operator, param.value)

      setFilters({...filters, [columnName]: columnFilter})
    }

    let filter = filters[columnName]


    return h(ColumnHeaderCell2, {
      menuRenderer: () => h(TableMenu, {"onFilterChange": onFilterChange, filter, "onGroupChange": setGroup, group}),
      name: columnName,
      style: {
        backgroundColor: filter.is_valid() || group == columnName ? "rgba(27,187,255,0.12)" : "#ffffff00"
      }
    }, [])
  }

  const cellRenderer = useCallback(
    ({ columnName, rowIndex, cell }) => {
      return h(
        EditableCell2,
        {
          onConfirm: (value) => {
            const tableUpdate = getTableUpdate(value, columnName, rowIndex, data, filters, group)
            setTableUpdates([...tableUpdates, tableUpdate])
            onChange(columnName, rowIndex, value);
          },
          value: editedData[rowIndex]?.[columnName] ?? data[rowIndex][columnName],
          intent: intentForCell(columnName, rowIndex),
        },
        []
      );
    },
    [data, editedData]
  );

  let getData = async () => {

    const dataURL = buildURL(url, Object.values(filters), group)

    if(group == undefined){
      dataURL.searchParams.append("_pkid", "order_by" )
    }

    dataURL.searchParams.append("page", page.toString());
    dataURL.searchParams.append("page_size", pageSize.toString());

    const response = await fetch(dataURL)
    const newData = await response.json()

    if(newData.length == 0){
      setError("Warning: No results matched query")
    } else {

      setError(undefined)
      setData(newData)
      setTotalCount(Number.parseInt(response.headers.get("X-Total-Count")));
    }

    return newData
  }

  // On mount get data and set filters
  useEffect(() => {
    (async function () {
      let data = await getData()
      let newFilters: Filters = Object.keys(data[0]).reduce((original, key) => {
        let originalFilters: Filters = {...original}
        originalFilters[key] = new Filter(key, undefined, "")
        return originalFilters
      }, {})
      setFilters({...filters, ...newFilters})
    }());
  }, [])

  // Update data on filter change and on data toggle / Not on mount
  const dataFetched = useRef(false)
  useLayoutEffect(() => {
    if(!dataFetched.current){
      dataFetched.current = true
      return
    }
    getData()
  }, [dataToggle, filters, group])

  if(data.length == 0 && error == undefined){
    return h(Spinner)
  }

  const submitTableUpdates = async () => {

    setUpdateProgress(0)

    let index = 0
    for(const update of tableUpdates){

      try {
        await submitChange(url, update)
      } catch (e) {

        setUpdateProgress(undefined)
        return // If there is an error, stop submitting
      }

      index += 1
      setUpdateProgress(index / tableUpdates.length)
    }

    setTableUpdates([])
    setEditedData([])
    setDataToggle(!dataToggle)
    setUpdateProgress(undefined)
  }

  const columns = nonIdColumns.map((columnName) => {
    return h(Column, {
      name: columnName,
      className: FINAL_COLUMNS.includes(columnName) ? "final-column" : "",
      columnHeaderCellRenderer: columnHeaderCellRenderer,
      cellRenderer: (rowIndex, cell) => cellRenderer({"columnName": columnName, "rowIndex": rowIndex, "cell": cell}),
      "key": columnName
    })
  })

  const getSelectionValues = (selections: Selection[]) => {

    if(selections.length == 0){
      setTableSelection({columns: [], filter: new Filter("_pkid", "in", "")})
      return
    }

    const rows = selections[0]?.rows
    const cols = selections[0]?.cols

    const columnsKeys = Object.keys(data[0])
    const selectedColumnKeys: string[] = columnsKeys.slice(cols[0], cols[1] + 1)
    const selectedRowIndices: number[] = rows != undefined ? range(rows[0], rows[1] + 1) : range(0, data.length)

    let selection: TableSelection
    if(rows == undefined){

      selection = {filters: new Filter("_pkid", "in", ""), columns: selectedColumnKeys}

    } else {
      const dbIds = selectedRowIndices.map((row) => data[row]['_pkid'])
      const filter = new Filter("_pkid", "in", "(" + dbIds.join(",") + ")")
      selection = {columns: selectedColumnKeys, "filters": [filter]}
    }

    setTableSelection(selection)
  }

  const rowHeaderCellRenderer = (rowIndex: number) => {
    const headerKey = group ? group : "_pkid"
    let name = data[rowIndex][headerKey]

    if (name == null) {
      name = "NULL";
    } else if(name.length > 47){
      name = name.slice(0, 47) + "..."
    }

    return h(RowHeaderCell2, { "name": name }, []);
  };

  return h(HotkeysProvider, {}, [
    h("div.table-container", {}, [
      h.if(error != undefined)("div.warning", {}, [error]),
      h("div.input-form", {}, [
        h(ButtonGroup, [
          h(
            Button,
            {
              onClick: () => {
                setTableUpdates([]);
                setEditedData([]);
              },
              disabled: isEmptyArray(editedData),
            },
            ["Clear changes"]
          ),
          h(
            Button,
            {
              type: "submit",
              onClick: submitTableUpdates,
              disabled: isEmptyArray(editedData),
              intent: "success",
            },
            ["Submit"]
          ),
        ]),
      ]),
      h(
        Table2,
        {
          selectionModes: group ? RegionCardinality.CELLS : SelectionModes.COLUMNS_AND_CELLS,
          rowHeaderCellRenderer: rowHeaderCellRenderer,
          onSelection: (selections: Selection[]) =>
            getSelectionValues(selections),
          numRows: data.length,
          // Dumb hacks to try to get the table to rerender on changes
          cellRendererDependencies: [editedData, data],
        },
        columns
      ),
      h.if(updateProgress != undefined)(
        ProgressPopover,
        {
          text: "Submitting Changes",
          value: updateProgress,
          progressBarProps: { intent: "success" },
        }
      )
    ]),
  ]);
}


