import { type ColumnEditorData, loadColumnRoute } from "../column-editor/data";

export type { ColumnEditorData };

export async function data(pageContext): Promise<ColumnEditorData> {
  return loadColumnRoute(pageContext);
}
