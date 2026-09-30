import h from "@macrostrat/hyper";
import { useData } from "vike-react/useData";
import { ColumnEditorPage } from "../column-editor/editor-shell";
import type { ColumnEditorData } from "../column-editor/data";

export function Page() {
  const data = useData<ColumnEditorData>();
  return h(ColumnEditorPage, { ...data, edit: true });
}
