import ColumnPage from "#/columns/@column/column-inspector";
import h from "@macrostrat/hyper";
import { usePageProps } from "~/renderer/usePageProps";

export function Page() {
  const props = usePageProps();
  console.log("Page props", props);
  return h(ColumnPage, props);
}
