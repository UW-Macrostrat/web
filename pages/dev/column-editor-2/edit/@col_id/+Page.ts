import h from "@macrostrat/hyper";
import { useData } from "vike-react/useData";
import { ColumnEditorPage } from "../../editor-shell";
import type { ColumnEditorData } from "../../data";

export function Page() {
  const data = useData<ColumnEditorData>();
  return h(ColumnEditorPage, data);
}
