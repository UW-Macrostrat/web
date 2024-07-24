export interface CellProps extends React.HTMLProps<HTMLTableCellElement> {
  value: string;
  onChange: (value: string) => void;
}
