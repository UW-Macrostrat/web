/** Loading a column into the editor, and the routes that address one.
 *
 * The editor is a three-route feature: an index that picks a column, an
 * editor keyed on the column in its path, and a page that starts a new
 * column from nothing. This module holds what all three share.
 */
import { fetchAPIData } from "~/_utils";
import type { AgeModelBoundary, UnitLong } from "@macrostrat/api-types";

export const EDITOR_BASE = "/dev/column-editor-2";

/** The column the index opens by default: Illinois, the house test column. */
export const DEFAULT_COLUMN_ID = 432;

export function editorHref(col_id: number): string {
  return `${EDITOR_BASE}/edit/${col_id}`;
}

export const newColumnHref = `${EDITOR_BASE}/new`;

export interface ColumnEditorData {
  col_id: number | null;
  columnInfo: any;
  units: UnitLong[];
  boundaries: AgeModelBoundary[];
  /** True for a column that exists only in this page — see `/new`. */
  isDraft?: boolean;
}

/** A column's summary, units and age-model boundaries. Returns `null` when
 * the column doesn't exist, so the caller decides what that means. */
export async function loadColumnForEditing(
  col_id: number
): Promise<ColumnEditorData | null> {
  const [columns, units, boundaries] = await Promise.all([
    fetchAPIData("/columns", { col_id, response: "long", format: "json" }),
    fetchAPIData("/units", { col_id, response: "long", show_position: true }),
    fetchAPIData("/age_model", { col_id }),
  ]);

  const columnInfo = columns?.[0] ?? null;
  if (columnInfo == null) return null;

  return {
    col_id,
    columnInfo,
    units: units ?? [],
    boundaries: boundaries ?? [],
  };
}

/** An empty column to build up by hand. It has no `col_id` until something
 * can write one. */
export function draftColumn(columnInfo: any): ColumnEditorData {
  return {
    col_id: null,
    columnInfo,
    units: [],
    boundaries: [],
    isDraft: true,
  };
}
