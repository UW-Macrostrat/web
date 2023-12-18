import { ColumnOperators, Filters, TableSelection, TableUpdate, DataParameters } from "./table";
import {secureFetch} from "@macrostrat-web/security";


export class Filter {
	readonly column_name: string;
	readonly operator: ColumnOperators | undefined;
	readonly value: string;

	constructor(column_name: string, operator: ColumnOperators | undefined, value: string){
		this.column_name = column_name
		this.operator = operator
		this.value = value
	}

	get formattedValue(){
		switch (this.operator) {
			case "in":
				return `(${this.value})`
			default:
				return this.value
		}
	}

	get urlValue() {
		return this.operator + "." + this.formattedValue
	}

	passes = (data: {[key: string] : string}) => {
		const filterValue = data[this.column_name]
		switch (this.operator) {
			case "eq":
				return filterValue == this.value
			case "lt":
				return filterValue < this.value
			case "le":
				return filterValue <= this.value
			case "gt":
				return filterValue > this.value
			case "ge":
				return filterValue >= this.value
			case "ne":
				return filterValue != this.value
			case "like":
				return filterValue.includes(this.value)
			case "in":
				return this.value.includes(filterValue)
			case "is":
				return filterValue == this.value
			default:
				return false
		}
	}

	is_valid = () => {
		if(this.operator == undefined || this.value == ""){
			return false
		}
		return true
	}

	to_array = () => {
		return [this.column_name, this.operator + "." + this.formattedValue]
	}

}


export function buildURL(baseURL: string, dataParameters: DataParameters){
	let url = new URL(baseURL)

	// Order by ID if no group is specified
	if(dataParameters?.group == undefined){
		url.searchParams.append("_pkid", "order_by" )

	// Otherwise order by group and group by group
	} else {
		url.searchParams.append(dataParameters.group, "order_by" )
		url.searchParams.append(dataParameters.group, "group_by")
	}

	// Add the page and page size
	url.searchParams.append("page", dataParameters.select.page);
	url.searchParams.append("page_size", dataParameters.select.pageSize);

	// Add the rest of the filters
	if(dataParameters?.filter != undefined){
		for(const filter of Object.values(dataParameters?.filter)){
			if(filter.is_valid()){
				const [columnName, filterValue] = filter.to_array()
				url.searchParams.append(columnName, filterValue);
			}
		}
	}

	return url
}

export const applyTableUpdate = (data: any[], tableUpdate: TableUpdate) => {

	let appliedData = structuredClone(data)
	for(const [rowIndex, row] of data.entries()){
		for(const columnName of Object.keys(row)){
			appliedData[rowIndex][columnName] = tableUpdate.applyToCell(appliedData[rowIndex][columnName], row, columnName)
		}
	}

	return appliedData
}

export const applyTableUpdates = (data: any[], tableUpdates: TableUpdate[]) => {

	let appliedData = structuredClone(data)
	for(const tableUpdate of tableUpdates){
		appliedData = applyTableUpdate(appliedData, tableUpdate)
	}

	return appliedData
}

/**
 * Wraps around submitChange to filter based on the group
 */
export const getTableUpdate = (
	url: string,
	value: string,
	columnName: string,
	rowIndex: number,
	data: any[],
	dataParameters: DataParameters
): TableUpdate => {

	dataParameters = structuredClone(dataParameters)
	if( dataParameters?.group != undefined){
		dataParameters.filter[dataParameters?.group] = new Filter(dataParameters?.group, "eq", data[rowIndex][dataParameters?.group])
	} else {
		dataParameters.filter["_pkid"] = new Filter("_pkid", "eq", data[rowIndex]["_pkid"])
	}

	const execute = async () => submitChange(url, value, [columnName], dataParameters.filter)

	const apply = (currentValue: string, row: {[key: string]: string}, cellColumnName: string) => {

		// If this function does not apply to this column skip it
		if (cellColumnName != columnName) {
			return currentValue
		}

		// If this row doesn't pass all the filters skip it
		if(dataParameters?.filter != undefined) {
			for (const filter of Object.values(dataParameters.filter)) {
				if (!filter.passes(row)) {
					return currentValue
				}
			}
		}
		// Return the new value
		return value
	}

	return {
		description: "Update " + columnName + " to " + value + " for " + JSON.stringify(dataParameters.filter),
		"execute": execute,
		"applyToCell": apply
	} as TableUpdate
}

export const submitChange = async (url: string, value: string, columns: string[], filters: {[key: string] : Filter}) => {

	// Query per column
	for (const column of columns) {

		let updateURL = new URL(url);

		// Add the filters to the query parameters
		for (const filter of Object.values(filters)) {

			// Check that the filter is valid
			if(!filter.is_valid()){
				continue
			}

			const [columnName, filterValue] = filter.to_array()
			updateURL.searchParams.append(columnName, filterValue);
		}

		// Create the request body
		let patch = { [column]: value };

		// Send the request
		let response = await secureFetch(updateURL, {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(patch),
		});

		if (response.status != 204) {

			// Stop execution if the request failed
			throw Error("Failed to update");
		}
	}
};

export const submitColumnCopy = async (url: string, sourceColumn: string, targetColumn: string, dataParameters: DataParameters) => {


	let updateURL = new URL(url + "/" + targetColumn);

	// Add the filters to the query parameters
	for (const filter of Object.values(dataParameters.filter)) {

		// Check that the filter is valid
		if(!filter.is_valid()){
			continue
		}

		const [columnName, filterValue] = filter.to_array()
		updateURL.searchParams.append(columnName, filterValue);
	}

	// Create the request body
	let patch = { "source_column": sourceColumn };

	// Send the request
	let response = await secureFetch(updateURL, {
		method: "PATCH",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(patch),
	});

	if (response.status != 204) {

		// Stop execution if the request failed
		throw Error("Failed to update");
	}
}

export function isEmptyArray(arr) {
	return arr.length == 0 || arr.every((x) => x == null);
}

export const range = (start, stop, step = 1) =>
	Array(Math.ceil((stop - start) / step))
		.fill(start)
		.map((x, y) => x + y * step);
