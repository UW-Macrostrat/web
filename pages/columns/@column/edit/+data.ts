/** Load the column named in the path. Runs on the client, like the column
 * page (see `../+config.ts`, which this route inherits). */
import { type ColumnEditorData, loadColumnRoute } from "../column-editor/data";

export type { ColumnEditorData };

export async function data(pageContext): Promise<ColumnEditorData> {
  return loadColumnRoute(pageContext);
}
