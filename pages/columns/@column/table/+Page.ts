import h from "@macrostrat/hyper";
import { useData } from "vike-react/useData";
import { ColumnEditorPage } from "../column-editor/editor-shell";
import type { ColumnEditorData } from "../column-editor/data";

/** The editor's interface, read-only: the column's units, its ingestion-format
 * sheet and its age model as tables, for anyone without leave to edit. */
export function Page() {
  const data = useData<ColumnEditorData>();
  return h(ColumnEditorPage, { ...data, edit: false });
}
