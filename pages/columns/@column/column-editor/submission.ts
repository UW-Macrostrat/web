/** The column as the ingestion format's tables — what the editor submits to
 * `/columns/submit` to be checked or written by the same code that ingests
 * a workbook. Built from the transaction, so it is the column as it now
 * stands: the `units` sheet is the export's rows, the `columns` and
 * `metadata` sheets come from the column's summary, and the `facies` sheet
 * is the scheme the column arrived with. */
import type { UnitLong } from "@macrostrat/api-types";
import type { ColumnSubmission, FaciesDef } from "./ingest-api";
import { unitToIngestionRow } from "./export";
import { toWKT, type Footprint } from "./location/geometry";

/** The dataset's own id for the column: the one it arrived with, else its
 * Macrostrat id, else `1`. The units sheet's `col_id` must match. */
export function localColumnID(columnInfo: any): string {
  const local = columnInfo?.local_id ?? columnInfo?.col_id;
  if (local == null || local === "") return "1";
  return String(local);
}

function text(value: unknown): string | null {
  if (value == null || value === "") return null;
  return String(value);
}

/** The `metadata` sheet: which project, and what kind of column. */
export function metadataSheet(columnInfo: any): ColumnSubmission["metadata"] {
  const metadata: ColumnSubmission["metadata"] = {};
  if (columnInfo?.project_id != null) {
    metadata.project_id = columnInfo.project_id;
  }
  if (columnInfo?.project_slug != null) {
    metadata.project_slug = columnInfo.project_slug;
  }
  if (columnInfo?.project != null) metadata.project_name = columnInfo.project;
  metadata.col_type = text(columnInfo?.col_type) ?? "column";
  metadata.axis_type = text(columnInfo?.axis_type) ?? "age";
  // The editor holds every cell; nothing is left to be filled down
  metadata.fill_values = "n";
  return metadata;
}

/** The `columns` sheet: one row, the column's summary as edited, located
 * by the footprint — the location's point as `lat`/`lng`, the region as
 * `geom`. The importer derives the rest in PostGIS. */
export function columnsSheet(
  columnInfo: any,
  footprint: Footprint | null = null
): Record<string, any>[] {
  let lat = columnInfo?.lat ?? null;
  let lng = columnInfo?.lng ?? null;
  let geom = columnInfo?.wkt ?? columnInfo?.geom ?? null;
  if (footprint != null) {
    const point = footprint.location.kind === "point" ? footprint.location.point : null;
    lat = point?.lat ?? null;
    lng = point?.lng ?? null;
    geom = footprint.region != null ? toWKT(footprint.region) : null;
  }
  return [
    {
      col_id: localColumnID(columnInfo),
      col_name: columnInfo?.col_name ?? "",
      col_group: columnInfo?.col_group ?? null,
      col_type: columnInfo?.col_type ?? null,
      axis_type: columnInfo?.axis_type ?? null,
      status_code: columnInfo?.status_code ?? null,
      lat,
      lng,
      geom,
      description: columnInfo?.description ?? null,
    },
  ];
}

/** The `units` sheet: the export's rows, keyed to the column's own id. */
export function unitsSheet(
  units: UnitLong[],
  columnInfo: any
): Record<string, any>[] {
  const col_id = localColumnID(columnInfo);
  return units.map((unit) => {
    const row: Record<string, any> = unitToIngestionRow(unit);
    row.col_id = col_id;
    // Section ids are the database's, meaningless to the importer, which
    // derives sections itself; leave them out rather than mislead it
    delete row.section_id;
    return row;
  });
}

/** The `facies` sheet, as it was given. */
export function faciesSheet(scheme: FaciesDef[]): Record<string, any>[] {
  return scheme.map((def) => ({
    facies_id: def.facies_id,
    facies: def.facies,
    facies_group: def.facies_group ?? null,
    description: def.description ?? null,
    interpretation: def.interpretation ?? null,
    color: def.color ?? null,
    lithology: def.lithology ?? null,
    environment: def.environment ?? null,
  }));
}

export function buildSubmission(
  columnInfo: any,
  units: UnitLong[],
  facies: FaciesDef[],
  footprint: Footprint | null = null
): ColumnSubmission {
  const submission: ColumnSubmission = {
    metadata: metadataSheet(columnInfo),
    columns: columnsSheet(columnInfo, footprint),
    units: unitsSheet(units, columnInfo),
  };
  if (facies.length > 0) submission.facies = faciesSheet(facies);
  return submission;
}
