import ColumnPage from "~/pages/columns/@column/column-inspector";
import h from "@macrostrat/hyper";

export function Page({ columnInfo, linkPrefix }) {
  return h(ColumnPage, { columnInfo, linkPrefix });
}
