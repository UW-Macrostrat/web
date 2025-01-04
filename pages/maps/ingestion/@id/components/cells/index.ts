export * from "./editable";
export * from "./checkbox-cell";
export * from "./interval-selection";
export * from "./long-text";
export * from "./util";

export interface CellProps extends React.HTMLProps<HTMLTableCellElement> {
  value: string;
  onChange: (value: string) => void;
}
