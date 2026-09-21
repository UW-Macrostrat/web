/** Load the column named in the path. Runs on the client (see `+config.ts`),
 * like the column page. */
import { render } from "vike/abort";
import { type ColumnEditorData, loadColumnForEditing } from "../../data";

export type { ColumnEditorData };

export async function data(pageContext): Promise<ColumnEditorData> {
  const raw = pageContext.routeParams.col_id;
  const col_id = parseInt(raw);
  if (isNaN(col_id)) {
    throw render(404, "Column IDs must be numbers.");
  }

  const data = await loadColumnForEditing(col_id);
  if (data == null) {
    throw render(404, `Column ${col_id} was not found.`);
  }
  return data;
}
