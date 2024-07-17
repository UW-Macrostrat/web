import ColumnPage from "./column-inspector";
import h from "@macrostrat/hyper";
import { usePageProps } from "~/renderer";

export function Page() {
  const props = usePageProps();
  return h(ColumnPage, props);
}
