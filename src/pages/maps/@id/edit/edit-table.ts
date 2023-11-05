import hyper from "@macrostrat/hyper";

import { useState, useEffect, useCallback, useRef, useLayoutEffect } from "react";
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

import { OperatorQueryParameter } from "~/pages/maps/@id/edit/table";
import { buildURL, Filter } from "~/pages/maps/@id/edit/table-util";
import TableMenu from "~/pages/maps/@id/edit/table-menu";

import "./override.sass"
import "@blueprintjs/table/lib/css/table.css";
import styles from "./edit-table.module.sass";

const h = hyper.styled(styles);

const range = (start, stop, step = 1) =>
  Array(Math.ceil((stop - start) / step))
    .fill(start)
    .map((x, y) => x + y * step);

interface Selection {
  cols: number[];
  rows: number[];
}


interface Filters {
  [key: string]: Filter;
}

interface TableSelection {
  columns: string[];
  filters: Filters;
}

export default function EditTable({ url }) {
  // Table values
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(999999);
  const [totalCount, setTotalCount] = useState(0);

  const [data, setData] = useState<any[]>([]);
  const [dataToggle, setDataToggle] = useState<boolean>(false);
  const [inputValue, setInputValue] = useState<string>("");
  const [error, setError] = useState<string | undefined>(undefined)
  const [filters, setFilters] = useState<Filters>({})
  const [group, setGroup] = useState<string | undefined>(undefined)
  const [tableSelection, setTableSelection] = useState<TableSelection>({columns: [], filter: new Filter("_pkid", "in", "")})


  // Sparse array to hold edited data
  const [editedData, setEditedData] = useState(new Array());

  const onChange = (key, row, text) => {
    let rowSpec = {};
    if (text == data[row][key] || (text == "" && data[row][key] == null)) {
      rowSpec = { $unset: [key] };
    } else {
      const rowOp = editedData[row] == null ? "$set" : "$merge";
      rowSpec = { [rowOp]: { [key]: text } };
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

    const columnName: string = Object.keys(data[0])[columnIndex]

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
    ({ key, row, cell }) => {
      return h(
        EditableCell2,
        {
          onConfirm: (value) => {
            onChange(key, row, value);
          },
          value: editedData[row]?.[key] ?? data[row][key],
          intent: intentForCell(key, row),
        },
        []
      );
    },
    [data, editedData]
  );

  let getData = async () => {

    const dataURL = buildURL(url, Object.values(filters), group)

    const response = await fetch(dataURL)
    const newData = await response.json()

    if(newData.length == 0){
      setError("Warning: No results matched query")
    } else {
      console.log("Data fetched successfully")

      setError(undefined)
      setData(newData)
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

  const columns = Object.keys(data[0]).filter(x => x != "_pkid").map((key) => {
    return h(Column, {
      name: key,
      columnHeaderCellRenderer: columnHeaderCellRenderer,
      cellRenderer: (row, cell) => cellRenderer({"key": key, "row": row, "cell": cell}),
      "key": key
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

      selection = {filter: new Filter("_pkid", "in", ""), columns: selectedColumnKeys}

    } else {
      const dbIds = selectedRowIndices.map((row) => data[row]['_pkid'])
      const filter = new Filter("_pkid", "in", "(" + dbIds.join(",") + ")")
      selection = {columns: selectedColumnKeys, "filter": filter}
    }

    setTableSelection(selection)
  }

  const rowHeaderCellRenderer = (rowIndex: number) => {
    const headerKey = group ? group : "_pkid"
    let name = data[rowIndex][headerKey]
    if(name.length > 47){
      name = name.slice(0, 47) + "..."
    }


    return h(RowHeaderCell2, { "name": name }, []);
  };

  const submitChange = async (value: string) => {
    for (const column of tableSelection.columns) {
      let updateURL = new URL(url);

      for (const filter of Object.values(tableSelection.filters)) {
        updateURL.searchParams.append(...filter.to_array());
      }

      let patch = { [column]: value };
      console.log(patch, JSON.stringify(patch));

      let response = await fetch(updateURL, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(patch),
      });

      if (response.status != 204) {
        console.error("Failed to update", response);
      }
    }
    setDataToggle(!dataToggle);
  };

  return h(HotkeysProvider, {}, [
    h("div.table-container", {}, [
      h.if(error)("div.warning", {}, [error]),
      h("div.input-form", {}, [
        h(InputGroup, {
          value: inputValue,
          className: "update-input-group",
          onChange: (e) => setInputValue(e.target.value),
        }),
        h(ButtonGroup, [
          h(
            Button,
            {
              onClick: () => setEditedData(new Array()),
              disabled: isEmptyArray(editedData),
            },
            ["Clear changes"]
          ),
          h(
            Button,
            {
              type: "submit",
              onClick: () => submitChange(inputValue),
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
          cellRendererDependencies: [editedData],
        },
        columns
      )
    ]),
  ]);
}

function isEmptyArray(arr) {
  return arr.length == 0 || arr.every((x) => x == null);
}

class TableDataManager {
  /** Low-level manager for windowed loading of table data. This will eventually be how
   * we work with the data, hopefully. */
  baseURL: string;
  totalCount: number;
  chunkSize: number = 100;

  init(baseURL: string) {
    this.baseURL = baseURL;
  }

  async getData(page: number) {
    let dataURL = new URL(this.baseURL);

    dataURL.searchParams.append("page", page.toString());
    dataURL.searchParams.append("page_size", this.chunkSize.toString());

    let response = await fetch(dataURL);
    let data = await response.json();

    this.totalCount = Number.parseInt(response.headers.get("X-Total-Count"));
  }
}
