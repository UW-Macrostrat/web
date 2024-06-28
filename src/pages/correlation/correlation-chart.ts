/** Correlation chart */
import h from "@macrostrat/hyper";

export interface ColumnIdentifier {
  col_id: number;
  col_name: string;
  project_id: number;
}

export function CorrelationChart({ columns }: { columns: ColumnIdentifier[] }) {
  return h(
    "ul",
    columns.map((col) =>
      h("li", h([h("code", col.col_id), " ", h("span.col-name", col.col_name)]))
    )
  );
}
