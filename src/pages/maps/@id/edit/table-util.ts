import {ColumnOperators, Filters} from "./table";


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