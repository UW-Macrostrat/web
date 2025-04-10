import { ColumnPage } from "./column-inspector";
import h from "@macrostrat/hyper";
import { useData } from "vike-react/useData";

export function Page() {
  const props = useData();
  return h(ColumnPage, props);
}
