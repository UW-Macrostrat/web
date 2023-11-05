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

