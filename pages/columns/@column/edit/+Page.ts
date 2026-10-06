import h from "@macrostrat/hyper";
import { useData } from "vike-react/useData";
import { OverviewPage } from "../column-editor/overview-page";
import { useSeedEditor } from "../column-editor/editor-shell";
import type { ColumnEditorData } from "../column-editor/data";

/** The editor's front page: the column's own fields, with the column drawn
 * beside them. Units and location are the pages below. */
export function Page() {
  const data = useData<ColumnEditorData>();
  useSeedEditor(data, true);
  return h(OverviewPage);
}
