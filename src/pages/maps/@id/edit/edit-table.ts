import hyper from "@macrostrat/hyper";

import { useState, useEffect, useCallback } from "react";
import { HotkeysProvider, InputGroup, Button } from "@blueprintjs/core";
import { Spinner } from "@blueprintjs/core";
import {
  Column,
  Table2,
  EditableCell2,
  RowHeaderCell2,
  SelectionModes,
} from "@blueprintjs/table";
import update from "immutability-helper";
import { TablePagination } from "@mui/material";

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

class Filter {
  constructor(column_name: string, operator: string, value: string) {
    this.column_name = column_name;
    this.operator = operator;
    this.value = value;
  }
  to_object = () => {
    let o = {};
    o[this.column_name] = this.operator + "." + this.value;
    return o;
  };

  to_array = () => {
    return [this.column_name, this.operator + "." + this.value];
  };
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

  const [data, setData] = useState(undefined);
  const [dataToggle, setDataToggle] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [tableSelection, setTableSelection] = useState<TableSelection>({
    columns: [],
    filters: [],
  });

  // Sparse array to hold edited data
  const [editedData, setEditedData] = useState(new Array());

  const onChange = (key, row, text) => {
    let rowSpec = {};
    if (text == null || text == "") {
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
    let dataURL = new URL(url);

    dataURL.searchParams.append("page", page.toString());
    dataURL.searchParams.append("page_size", pageSize.toString());

    let response = await fetch(dataURL);
    let data = await response.json();

    setTotalCount(Number.parseInt(response.headers.get("X-Total-Count")));
    setData(data);
  };

  useEffect(() => {
    getData();
  }, [page, pageSize]);

  if (data == undefined) {
    return h(Spinner);
  }

  const columns = Object.keys(data[0])
    .filter((x) => x != "_pkid")
    .map((key) => {
      return h(Column, {
        name: key,
        cellRenderer: (row, cell) =>
          cellRenderer({ key: key, row: row, cell: cell }),
        key: key,
      });
    });

  const getSelectionValues = (selections: Selection[]) => {
    if (selections.length == 0) {
      setTableSelection({
        columns: [],
        filters: { ...tableSelection.filters, tableSelection: undefined },
      });
      return;
    }

    const rows = selections[0]?.rows;
    const cols = selections[0]?.cols;

    const columnsKeys = Object.keys(data[0]);
    const selectedColumnKeys = columnsKeys.slice(cols[0], cols[1] + 1);

    let selection: TableSelection;
    if (rows == undefined) {
      selection = { columns: selectedColumnKeys, ...tableSelection };
    } else {
      const selectedRowIndices =
        rows != undefined ? range(rows[0], rows[1] + 1) : range(0, data.length);
      const dbIds = selectedRowIndices.map((row) => data[row]["_pkid"]);
      const filter = new Filter("_pkid", "in", "(" + dbIds.join(",") + ")");

      selection = {
        columns: selectedColumnKeys,
        filters: { ...tableSelection.filters, tableSelection: filter },
      };
    }

    setTableSelection(selection);
  };

  const rowHeaderCellRenderer = (rowIndex: number) => {
    return h(RowHeaderCell2, { name: data[rowIndex]["_pkid"] }, []);
  };

  const submitChange = async (value: string) => {
    for (const column of tableSelection.columns) {
      let updateURL = new URL(url);

      for (const filter: Filter of Object.values(tableSelection.filters)) {
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
      h("div.input-form", {}, [
        h(InputGroup, {
          value: inputValue,
          className: "update-input-group",
          onChange: (e) => setInputValue(e.target.value),
        }),
        h(Button, { type: "submit", onClick: () => submitChange(inputValue) }, [
          "Submit",
        ]),
      ]),
      h(
        Table2,
        {
          selectionModes: SelectionModes.COLUMNS_AND_CELLS,
          rowHeaderCellRenderer: rowHeaderCellRenderer,
          onSelection: (selections: Selection[]) =>
            getSelectionValues(selections),
          numRows: data.length,
          // Dumb hacks to try to get the table to rerender on changes
          cellRendererDependencies: [editedData],
          enableFocusedCell: true,
        },
        columns
      ),
      // h(TablePagination, {
      //   component: "div",
      //   count: totalCount,
      //   rowsPerPage: pageSize,
      //   page: page,
      //   onRowsPerPageChange: (e) => setPageSize(e.target.value),
      //   onPageChange: (e, p) => setPage(p),
      // }),
    ]),
  ]);
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
