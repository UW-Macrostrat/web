import {Filter} from "./table-util.ts";


export type ColumnOperators = "eq" | "lt" | "le" | "gt" | "ge" | "ne" | "like" | "in" | "is";

export interface ColumnOperatorOption {
	key: ColumnOperators;
	value: string;
	verbose: string;
	placeholder?: string;
}

export interface OperatorQueryParameter {
	operator: ColumnOperators | undefined;
	value: string;
}

interface Filters {
	[key: string]: Filter;
}

interface Selection {
	cols: number[];
	rows: number[];
}


interface Filters {
	[key: string]: Filter;
}

// An object that represents a selection of rows and columns
interface TableSelection {
	columns: string[];
	filters: Filters;
}

// An object that represents a value update made on top of a specific TableSelection
interface TableUpdate {
	selection: TableSelection;
	value: string;
}