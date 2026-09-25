/** Loading a column into the editor, and the routes that address one.
 *
 * The editor lives under the column it edits: `/columns/:id/edit` edits it,
 * `/columns/:id/table` is the same interface read-only, and `/columns/new`
 * starts a column from nothing. Picking *which* column is the column list's
 * job (`/columns`), so there is no picker of the editor's own.
 */
import { fetchAPIData } from "~/_utils";
import type { AgeModelBoundary, UnitLong } from "@macrostrat/api-types";

/** The column page — where Close leads, and the parent of both routes. */
export function columnHref(col_id: number): string {
  return `/columns/${col_id}`;
}

export function editorHref(col_id: number): string {
  return `/columns/${col_id}/edit`;
}

export function tableHref(col_id: number): string {
  return `/columns/${col_id}/table`;
}

export const newColumnHref = "/columns/new";

/** Where leaving a draft column leads: the list. */
export const COLUMNS_INDEX = "/columns";

export interface ColumnEditorData {
  col_id: number | null;
  columnInfo: any;
  units: UnitLong[];
  boundaries: AgeModelBoundary[];
  /** True for a column that exists only in this page — see `/columns/new`. */
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

/** The `+data` hook both column routes share: the column named in the path,
 * or a 404 when there is none. */
export async function loadColumnRoute(pageContext): Promise<ColumnEditorData> {
  // Lazy so the 404 helper is only reached from a route's `+data`
  const { render } = await import("vike/abort");
  const raw = pageContext.routeParams.column;
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
