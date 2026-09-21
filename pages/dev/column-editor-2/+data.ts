/** Load the column to edit: its summary, units and age-model boundaries from
 * the v2 API. Runs on the client (see `+config.ts`), like the column page. */
import { fetchAPIData } from "~/_utils";
import { render } from "vike/abort";
import type { UnitLong } from "@macrostrat/api-types";
import type { AgeModelBoundary } from "@macrostrat/api-types";

/** The default column: Illinois (432), the house test column. */
const DEFAULT_COLUMN_ID = 432;

export interface ColumnEditorData {
  col_id: number;
  columnInfo: any;
  units: UnitLong[];
  boundaries: AgeModelBoundary[];
}

export async function data(pageContext): Promise<ColumnEditorData> {
  const raw = pageContext.urlParsed.search?.col_id;
  let col_id = DEFAULT_COLUMN_ID;
  if (raw != null && raw !== "") {
    col_id = parseInt(raw);
    if (isNaN(col_id)) {
      throw render(400, "col_id must be a number.");
    }
  }

  const [columns, units, boundaries] = await Promise.all([
    fetchAPIData("/columns", { col_id, response: "long", format: "json" }),
    fetchAPIData("/units", { col_id, response: "long", show_position: true }),
    fetchAPIData("/age_model", { col_id }),
  ]);

  const columnInfo = columns?.[0] ?? null;
  if (columnInfo == null) {
    throw render(404, `Column ${col_id} was not found.`);
  }

  return {
    col_id,
    columnInfo,
    units: units ?? [],
    boundaries: boundaries ?? [],
  };
}
