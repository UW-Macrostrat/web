/** Loading a column into the editor, and the routes that address one.
 *
 * The editor lives under the column it edits: `/columns/:id/edit` edits it,
 * `/columns/:id/table` is the same interface read-only, and `/columns/new`
 * starts a column from nothing. Picking *which* column is the column list's
 * job (`/columns`), so there is no picker of the editor's own.
 */
import { fetchAPIData } from "~/_utils";
import type { AgeModelBoundary, UnitLong } from "@macrostrat/api-types";
import type { MultiPolygon, Polygon } from "geojson";
import { apiV2Prefix } from "@macrostrat-web/settings";
import type { FaciesDef, IngestNotice, IngestResult } from "./ingest-api";

/** The column page — where Close leads, and the parent of both routes. */
export function columnHref(col_id: number): string {
  return `/columns/${col_id}`;
}

/** The editor's front page: the column's own fields, with the column drawn. */
export function editorHref(col_id: number): string {
  return `/columns/${col_id}/edit`;
}

export function unitsEditorHref(col_id: number): string {
  return `/columns/${col_id}/edit/units`;
}

export function locationHref(col_id: number): string {
  return `/columns/${col_id}/edit/location`;
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
  /** Where the column came from: the API, or a dry run of the ingestion
   * pipeline over an uploaded workbook, whose units are the pipeline's view
   * of the data and carry provisional ids. */
  source?: "api" | "dry-run";
  /** What the pipeline said about the column, when it has been asked. */
  notices?: IngestNotice[];
  /** The dataset's facies scheme, when it has one. */
  facies?: FaciesDef[];
  /** The column's stored footprint polygon, when it has an area. */
  region?: Polygon | MultiPolygon | null;
}

/** A column's summary, units and age-model boundaries. Returns `null` when
 * the column doesn't exist, so the caller decides what that means. */
export async function loadColumnForEditing(
  col_id: number
): Promise<ColumnEditorData | null> {
  // The API serves only active columns unless told otherwise, and the
  // editor must open a column whatever its status (`+data.shared.ts` does
  // the same for the column page).
  const status_code = "active,in process";
  const [columns, units, boundaries, geojson] = await Promise.all([
    fetchAPIData("/columns", {
      col_id,
      response: "long",
      format: "json",
      status_code,
    }),
    fetchAPIData("/units", {
      col_id,
      response: "long",
      show_position: true,
      status_code,
    }),
    fetchAPIData("/age_model", { col_id }),
    fetchFootprint(col_id, status_code),
  ]);

  const columnInfo = columns?.[0] ?? null;
  if (columnInfo == null) return null;

  // A column located by a point alone has no area; the API still returns a
  // geometry for it, which is not a region
  let region: Polygon | MultiPolygon | null = null;
  const geometry = geojson?.features?.[0]?.geometry;
  const hasArea = Number(columnInfo.col_area ?? 0) > 0;
  if (hasArea && (geometry?.type === "Polygon" || geometry?.type === "MultiPolygon")) {
    region = geometry;
  }

  return {
    col_id,
    columnInfo,
    units: units ?? [],
    boundaries: boundaries ?? [],
    region,
    source: "api",
  };
}

/** The column's footprint as bare GeoJSON. Not through `fetchAPIV2Result`,
 * which unwraps the API's `success` envelope — `geojson_bare` has none. */
async function fetchFootprint(col_id: number, status_code: string): Promise<any> {
  const url = new URL(apiV2Prefix + "/columns", globalThis.location?.href);
  url.search = new URLSearchParams({
    col_id: String(col_id),
    format: "geojson_bare",
    status_code,
  }).toString();
  try {
    const res = await fetch(url.toString());
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    return null;
  }
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

/** An older backend's parsed previews (`{columnInfo, units}`, from before the
 * read-back payload) open as unsaved drafts, like a column started by hand. */
function previewsAsDrafts(result: IngestResult): ColumnEditorData[] {
  const previews = result.summary?.columns ?? [];
  return previews
    .filter((col: any) => col?.columnInfo != null && Array.isArray(col.units))
    .map((col: any) => ({
      ...draftColumn(col.columnInfo),
      units: col.units,
      source: "dry-run" as const,
      notices: result.notices,
    }));
}

/** The columns an ingestion result holds, each as the editor takes it.
 *
 * A dry run's data is exactly what the database would hold — resolved
 * lithologies, filled values, the age model's surfaces — read back before
 * the rollback, with negative provisional ids. It opens as a *loaded*
 * column rather than a draft, since its units carry their boundaries, and
 * with no `col_id`, since nothing was written. The notices that apply to the
 * column come along, as does the workbook's facies scheme. */
export function columnsFromIngestResult(
  result: IngestResult
): ColumnEditorData[] {
  const data = result.data;
  if (data == null) return previewsAsDrafts(result);
  return data.columns.map((column) => {
    const col_id = column.col_id;
    const notices = result.notices.filter(
      (n) => n.col_id == null || String(n.col_id) === String(column.local_id)
    );
    return {
      col_id: null,
      columnInfo: { ...column, t_units: column.t_units ?? 0 },
      units: data.units.filter((u) => u.col_id === col_id),
      boundaries: data.boundaries.filter((b) => b.col_id === col_id),
      isDraft: false,
      source: "dry-run",
      notices,
      facies: data.facies ?? [],
    };
  });
}
