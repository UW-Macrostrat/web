import { Filter } from "../components/table-util";

export type ColumnOperators =
  | "eq"
  | "lt"
  | "le"
  | "gt"
  | "ge"
  | "ne"
  | "is_distinct_from"
  | "is_not_distinct_from"
  | "like"
  | "in"
  | "is";

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

export interface ColumnConfigGenerator {
  url: string;
  defaultColumnConfig: ColumnConfig;
  dataParameters: DataParameters;
  addTableUpdate: (updates: TableUpdate[]) => void;
  transformedData: any[];
  data: any[];
  ref: any;
}

export type ColumnConfig = {
  [key: string]: ColumnProps;
};

export interface CustomTableProps {
  url: string;
  ingestProcessId: number;
}

export const COMMON_COLUMNS = [
  "omit",
  "source_layer",
  "source_id",
  "orig_id",
  "descrip",
];
