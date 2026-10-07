import h from "@macrostrat/hyper";
import { useData } from "vike-react/useData";
import { LocationEditorPage } from "../../column-editor/location/location-editor";
import { useSeedEditor } from "../../column-editor/editor-shell";
import type { ColumnEditorData } from "../../column-editor/data";

export function Page() {
  const data = useData<ColumnEditorData>();
  useSeedEditor(data, true);
  return h(LocationEditorPage);
}
