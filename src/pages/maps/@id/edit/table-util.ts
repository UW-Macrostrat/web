import { ColumnOperators, Filters, TableSelection, TableUpdate } from "./table";
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

export function buildURL(baseURL: string, filters: Filter[], group: string | undefined){
	let updateURL = new URL(baseURL)

	for(const filter of filters){

		if(filter.is_valid()) {
			const [key, value] = filter.to_array()
			updateURL.searchParams.append(key, value)
		}
	}

	if(group != undefined){
		updateURL.searchParams.append(group, "group_by")
	}

	return updateURL
}

/**
 * Builds a table update from the current table state
 */
export const getTableUpdate = (
	value: string,
	columnName: string,
	rowIndex: number,
	data: any[],
	filters: Filters,
	group: string | undefined
): TableUpdate => {

	filters = {...filters}
	if( group != undefined){
		filters[group] = new Filter(group, "eq", data[rowIndex][group])
	} else {
		filters["_pkid"] = new Filter("_pkid", "eq", data[rowIndex]["_pkid"])
	}

	const selection: TableSelection = {
		columns: [columnName],
		filters: filters
	}

	return {
		selection,
		value: value
	}
}

export const submitChanges = async (url: string, updates: TableUpdate[]) => {
	for(const update of updates){
		console.log("Update: ", update)

		// await submitChange(url, update)
	}
}

export const submitChange = async (url: string, {selection, value}: TableUpdate) => {

	// Query per column
	for (const column of selection.columns) {

		let updateURL = new URL(url);

		// Add the filters to the query parameters
		for (const filter of Object.values(selection.filters)) {

			// Check that the filter is valid
			if(!filter.is_valid()){
				continue
			}

			console.log("Filter: ", filter)

			const [searchTerm, searchValue] = filter.to_array()
			updateURL.searchParams.append(searchTerm, searchValue);
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

export function isEmptyArray(arr) {
	return arr.length == 0 || arr.every((x) => x == null);
}