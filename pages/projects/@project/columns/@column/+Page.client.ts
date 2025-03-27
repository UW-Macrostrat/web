import ColumnPage from "#/columns/@column/column-inspector";
import h from "@macrostrat/hyper";
import { usePageProps } from "~/renderer/usePageProps";

export function Page() {
  const { columnInfo, linkPrefix } = usePageProps();
  return h(ColumnPage, { columnInfo, linkPrefix });
}
