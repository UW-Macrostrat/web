
import hyper from "@macrostrat/hyper";

import { ReactElement, ReactFragment, useState, useEffect, useMemo } from "react";
import { HotkeysProvider, InputGroup, Button } from "@blueprintjs/core";
import { Spinner } from "@blueprintjs/core";
import { Column, Table2, EditableCell2, RowHeaderCell2, SelectionModes } from "@blueprintjs/table";
import {TablePagination} from "@mui/material"

import "@blueprintjs/table/lib/css/table.css";
import styles from "./editTable.module.sass";


const h = hyper.styled(styles);



const range = (start, stop, step = 1) =>
  Array(Math.ceil((stop - start) / step)).fill(start).map((x, y) => x + y * step)


interface Selection {
  cols: number[];
  rows: number[];
}

class Filter {
  constructor(column_name: string, operator: string, value: string){
    this.column_name = column_name
    this.operator = operator
    this.value = value
  }
  to_object = () => {
    let o = {}
    o[this.column_name] = this.operator + "." + this.value
    return o
  }

  to_array = () => {
    return [this.column_name, this.operator + "." + this.value]
  }

}

interface Filters {
  [key: string]: Filter;
}

interface TableSelection {
  columns: string[];
  filters: Filters
}


export default function EditTable({url}){

  // Table values
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(999999);
  const [totalCount, setTotalCount] = useState(0);

  const [data, setData] = useState(undefined);
  const [dataToggle, setDataToggle] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [tableSelection, setTableSelection] = useState<TableSelection>({columns: [], filters: []})

  const cellRenderer = ({key, row, cell}) => {

    return h(EditableCell2, {onChange: (e) => console.log(), "value": data[row][key]}, [])
  }

  let getData = async () => {

    let dataURL = new URL(url)

    dataURL.searchParams.append("page", page.toString())
    dataURL.searchParams.append("page_size", pageSize.toString())

    let response = await fetch(dataURL)
    let data = await response.json()

    setTotalCount(Number.parseInt(response.headers.get("X-Total-Count")))
    setData(data)
  }

  useEffect(() => {
    getData()
  }, [page, pageSize, dataToggle])


  if(data == undefined){
    return h(Spinner)
  }

  const columns = Object.keys(data[0]).filter(x => x != "db_id").map((key) => {
    return h(Column, {name: key, cellRenderer: (row, cell) => cellRenderer({"key": key, "row": row, "cell": cell}), "key": key})
  })

  const getSelectionValues = (selections: Selection[]) => {

    if(selections.length == 0){
      setTableSelection({columns: [], filters: {...tableSelection.filters, "tableSelection": undefined}})
      return
    }

    const rows = selections[0]?.rows
    const cols = selections[0]?.cols

    const columnsKeys = Object.keys(data[0])
    const selectedColumnKeys = columnsKeys.slice(cols[0], cols[1] + 1)

    let selection: TableSelection
    if(rows == undefined){
      selection = {columns: selectedColumnKeys, ...tableSelection}

    } else {
      const selectedRowIndices = rows != undefined ? range(rows[0], rows[1] + 1) : range(0, data.length)
      const dbIds = selectedRowIndices.map((row) => data[row]['db_id'])
      const filter = new Filter("db_id", "in", "(" + dbIds.join(",") + ")")


      selection = {columns: selectedColumnKeys, filters: {...tableSelection.filters, "tableSelection": filter}}
    }

    setTableSelection(selection)
  }

  const rowHeaderCellRenderer = (rowIndex: number) => {
    return h(RowHeaderCell2, {name: data[rowIndex]['db_id']}, [])
  }

  const submitChange = async (value: string) => {
    for (const column of tableSelection.columns) {

      let updateURL = new URL(url)

      for(const filter: Filter of Object.values(tableSelection.filters)){
        updateURL.searchParams.append(...filter.to_array())
      }

      let patch =  {[column]: value}
      console.log(patch, JSON.stringify(patch))


      let response = await fetch(updateURL, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(patch),
      })

      if(response.status != 204){
        console.error("Failed to update", response)
      }
    }
    setDataToggle(!dataToggle)
  }


  return h(HotkeysProvider, {}, [
    h("div.table-container", {}, [
      h("div.input-form", {}, [
        h(InputGroup, {"value": inputValue, className: "update-input-group", onChange: (e) => setInputValue(e.target.value)}),
        h(Button, {type: "submit", onClick: () => submitChange(inputValue)}, ["Submit"])
      ]),
      h(Table2,
        {
          selectionModes: SelectionModes.COLUMNS_AND_CELLS,
          rowHeaderCellRenderer: rowHeaderCellRenderer,
          onSelection: (selections: Selection[]) => getSelectionValues(selections),
          numRows: data.length
        },
        [
          columns
        ]
      ),
      h(TablePagination, {component: "div", count: totalCount, rowsPerPage: pageSize, page: page, onRowsPerPageChange: (e) => setPageSize(e.target.value), onPageChange: (e, p) => setPage(p)}),
    ])
  ])
}