import { ColumnPage } from "./column-inspector";
import h from "@macrostrat/hyper";
import { usePageProps } from "~/renderer/usePageProps";

export function Page() {
  const props = usePageProps();
  return h(ColumnPage, props);
}
