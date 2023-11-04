
// @ts-ignore
import hyper from "@macrostrat/hyper";

import {useState, useEffect, useLayoutEffect, useRef} from "react";
import { HotkeysProvider, InputGroup, Button } from "@blueprintjs/core";
import { Spinner } from "@blueprintjs/core";
import { Column, Table2, EditableCell2, RowHeaderCell2, ColumnHeaderCell2, SelectionModes } from "@blueprintjs/table";

import TableMenu from "./TableMenu";

import "@blueprintjs/table/lib/css/table.css";
import "@blueprintjs/select/lib/css/blueprint-select.css";

import "./override.sass"
import styles from "./editTable.module.sass";
import {Filters, OperatorQueryParameter} from "./table";
import {buildURL, Filter} from "./table-util.ts";


const h = hyper.styled(styles);



const range = (start: number, stop: number, step = 1) =>
		Array(Math.ceil((stop - start) / step)).fill(start).map((x, y) => x + y * step)


interface Selection {
	cols: number[];
	rows: number[];
}




interface TableSelection {
	columns: string[];
	filter: Filter;
}




interface EditTableProps {
	url: string;
}

export default function EditTable({url}: EditTableProps){

	const [data, setData] = useState<any[]>([]);
	const [inputValue, setInputValue] = useState<string>("");
	const [error, setError] = useState<string | undefined>(undefined)
	const [filters, _setFilters] = useState<Filters>({})
	const [tableSelection, _setTableSelection] = useState<TableSelection>({columns: [], filter: new Filter("db_id", "in", "")})
	const [valueSelection, setValueSelection] = useState<string[]>([])

	const setFilters = (filters: Filters) => {
		_setFilters(filters)
	}

	const setTableSelection = (selection: TableSelection) => {
		_setTableSelection(selection)
	}


	const columnHeaderCellRenderer = (columnIndex: number) => {

		const columnName: string = Object.keys(data[0])[columnIndex]

		const onChange = (param: OperaterQueryParameter) => {

			const columnFilter = new Filter(columnName, param.operator, param.value)

			setFilters({...filters, [columnName]: columnFilter})
		}

		let filter = filters[columnName]


		return h(ColumnHeaderCell2, {
			menuRenderer: () => h(TableMenu, {"onChange": onChange, filter}),
			name: columnName
		}, [])
	}

	const cellRenderer = ({key, row, cell}) => {

		return h(EditableCell2, {onChange: (e) => console.log(), "value": data[row][key]}, [])
	}

	let getData = async () => {

		const dataURL = buildURL(url, Object.values(filters))

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

	const dataFetched = useRef(false)
	useLayoutEffect(() => {
		if(!dataFetched.current){
			dataFetched.current = true
			return
		}
		getData()
	}, [tableSelection, filters])


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

	if(data.length == 0 && error == undefined){
		return h(Spinner)
	}


	const getSelectionValues = (selections: Selection[]) => {

		if(selections.length == 0){
			setTableSelection({columns: [], filter: new Filter("db_id", "in", "")})
			return
		}

		const rows = selections[0]?.rows
		const cols = selections[0]?.cols

		const columnsKeys = Object.keys(data[0])
		const selectedColumnKeys: string[] = columnsKeys.slice(cols[0], cols[1] + 1)
		const selectedRowIndices: number[] = rows != undefined ? range(rows[0], rows[1] + 1) : range(0, data.length)

		let selection: TableSelection
		if(rows == undefined){

			selection = {filter: new Filter("db_id", "in", ""), columns: selectedColumnKeys}

		} else {
			const dbIds = selectedRowIndices.map((row) => data[row]['db_id'])
			const filter = new Filter("db_id", "in", "(" + dbIds.join(",") + ")")
			selection = {columns: selectedColumnKeys, "filter": filter}
		}

		let valueSelection: string[] = []
		for(const column of selectedColumnKeys){
			for(const row of selectedRowIndices){
				valueSelection.push(data[row][column])
			}
		}

		setValueSelection(valueSelection)
		setTableSelection(selection)
	}

	const rowHeaderCellRenderer = (rowIndex: number) => {
		return h(RowHeaderCell2, {name: data[rowIndex]['db_id']}, [])
	}



	const submitChange = async (value: string) => {
		for (const column of tableSelection.columns) {

			let updateURL = buildURL(url, [tableSelection.filter, ...Object.values(filters)])

			let patch =  {[column]: value}


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
		getData()
	}


	return h(HotkeysProvider, {}, [
		h("div.table-container", {}, [
			h.if(error)("div.warning", {}, [error]),
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
							...Object.keys(data[0]).filter(x => x != "db_id").map((key) => {
							return h(Column, {
								name: key,
								columnHeaderCellRenderer: columnHeaderCellRenderer,
								cellRenderer: (row, cell) => cellRenderer({"key": key, "row": row, "cell": cell}),
								"key": key
							})
						})
					]
			)
		])
	])
}