/** What the homepage hero fetches.
 *
 * `+data.ts` runs the seed on the server so the first paint already has a
 * column; the hero then runs the same calls in the browser as the reader moves
 * the map. `fetchAPIData` works in both places (it uses `cross-fetch`), so the
 * two paths can't drift.
 *
 * Both the column and the map credit are keyed by **point** — the map's centre.
 * That is a stopgap: see the "Column spatial queries" feature area for the tile
 * layer and the bbox/polygon route this should use instead.
 */
import { fetchAPIData } from "~/_utils";
import type { UnitLong } from "@macrostrat/api-types";

/** Everything the hero shows about a column that isn't derived from its units. */
export interface HeroColumnInfo {
  col_id: number;
  col_name: string;
  col_group: string | null;
  project_id: number;
  /** Macrostrat reference ids, for the credit line below the hero. */
  refs: number[];
}

export interface HeroColumn {
  info: HeroColumnInfo;
  units: UnitLong[];
  /** The column's own outline, drawn on the map. */
  footprint: GeoJSON.Feature | null;
}

export interface HeroPoint {
  lat: number;
  lng: number;
}

/** Anything with an age range and the intervals that range sits in: a column
 * unit and a matched geologic map unit both answer this shape, which is what
 * lets a click on either one drive the same filter. */
export interface AgedFeature {
  t_age: number;
  b_age: number;
  t_int_id?: number | null;
  b_int_id?: number | null;
  t_int_age?: number | null;
  b_int_age?: number | null;
  t_int_name?: string | null;
  b_int_name?: string | null;
}

/** The geologic map unit under a point, as the v2 API matches it. */
export interface MapUnitMatch extends AgedFeature {
  name: string | null;
  source_id: number;
  color: string | null;
  /** Macrostrat column unit ids this map unit matches, when any. */
  macro_units: number[];
}

/** A map source, for the credit line below the hero. */
export interface MapSourceRef {
  source_id: number;
  name: string;
  ref_title: string | null;
  authors: string | null;
  ref_year: string | null;
  url: string | null;
  scale: string | null;
}

/** Map coordinates carry full float precision, far past the resolution of
 * anything Macrostrat holds; rounding also keeps the request URLs stable, which
 * matters when the map's centre drives them. */
export function roundCoordinate(value: number): number {
  return Math.round(value * 1e5) / 1e5;
}

/** Column stats the inset shows, read off the units rather than fetched. */
export function summarizeUnits(units: UnitLong[]) {
  let b_age = 0;
  let t_age = Infinity;
  for (const unit of units) {
    if (unit.b_age > b_age) b_age = unit.b_age;
    if (unit.t_age < t_age) t_age = unit.t_age;
  }
  if (!Number.isFinite(t_age)) t_age = 0;
  return { n_units: units.length, b_age, t_age };
}

/** A `/columns` GeoJSON feature plus its units, or null when it has none. */
async function buildColumn(feature: any): Promise<HeroColumn | null> {
  const props = feature.properties;
  const units = await fetchColumnUnits(props.col_id);
  if (units == null || units.length === 0) return null;

  let footprint: GeoJSON.Feature | null = null;
  if (feature.geometry != null) {
    footprint = {
      type: "Feature",
      id: props.col_id,
      geometry: feature.geometry,
      properties: { col_id: props.col_id },
    };
  }

  return { info: columnInfoFromProperties(props), units, footprint };
}

function columnInfoFromProperties(props: any): HeroColumnInfo {
  return {
    col_id: props.col_id,
    col_name: props.col_name,
    col_group: props.col_group ?? null,
    project_id: props.project_id,
    refs: props.refs ?? [],
  };
}

/** The units in a column, oldest-first as the API returns them. Empty on any
 * failure, which the hero reads as "no column here". */
export async function fetchColumnUnits(colID: number): Promise<UnitLong[]> {
  try {
    return await fetchAPIData("/units", {
      col_id: colID,
      response: "long",
      show_position: true,
      status_code: "active",
    });
  } catch (err) {
    console.warn("[homepage] units unavailable:", err?.message ?? err);
    return null;
  }
}

/** The column containing a point, with its units and outline. Null when the
 * point is outside the columns' coverage, or on any failure. */
export async function fetchColumnAtPoint(
  lat: number,
  lng: number
): Promise<HeroColumn | null> {
  try {
    // `format=geojson` with `response=long` returns the outline and the full
    // column record together, so this is one request rather than two.
    const collection = await fetchAPIData("/columns", {
      lat: roundCoordinate(lat),
      lng: roundCoordinate(lng),
      response: "long",
      format: "geojson",
      status_code: "active",
    });
    const feature = collection?.features?.[0];
    if (feature == null) return null;

    return buildColumn(feature);
  } catch (err) {
    console.warn("[homepage] column lookup failed:", err?.message ?? err);
    return null;
  }
}

/** A column by id, for a featured area that pins one. Same shape as the point
 * lookup, so the hero doesn't care which way its column arrived. */
export async function fetchColumnByID(
  colID: number
): Promise<HeroColumn | null> {
  try {
    const collection = await fetchAPIData("/columns", {
      col_id: colID,
      response: "long",
      format: "geojson",
      status_code: "active",
    });
    const feature = collection?.features?.[0];
    if (feature == null) return null;
    return buildColumn(feature);
  } catch (err) {
    console.warn("[homepage] column lookup failed:", err?.message ?? err);
    return null;
  }
}

/** The geologic map unit at a point. The API answers once per map scale; the
 * first entry is the most detailed, which is what the reader is looking at. */
export async function fetchMapUnitAtPoint(
  lat: number,
  lng: number
): Promise<MapUnitMatch | null> {
  try {
    const matches = await fetchAPIData("/geologic_units/map", {
      lat: roundCoordinate(lat),
      lng: roundCoordinate(lng),
    });
    const match = matches?.[0];
    if (match == null) return null;
    if (match.t_age == null || match.b_age == null) return null;
    return {
      name: match.name ?? null,
      source_id: match.source_id,
      t_age: match.t_age,
      b_age: match.b_age,
      t_int_id: match.t_int_id ?? null,
      b_int_id: match.b_int_id ?? null,
      t_int_age: match.t_int_age ?? null,
      b_int_age: match.b_int_age ?? null,
      t_int_name: match.t_int_name ?? null,
      b_int_name: match.b_int_name ?? null,
      color: match.color ?? null,
      macro_units: match.macro_units ?? [],
    };
  } catch (err) {
    console.warn("[homepage] map unit lookup failed:", err?.message ?? err);
    return null;
  }
}

/** Interval records by id, for intervals outside the timescale the hero holds:
 * supereons, and anything on a project's own timescale. */
export async function fetchIntervalsByID(ids: number[]): Promise<any[]> {
  if (ids.length === 0) return [];
  try {
    return await fetchAPIData("/defs/intervals", { int_id: ids.join(",") });
  } catch (err) {
    console.warn("[homepage] interval lookup failed:", err?.message ?? err);
    return [];
  }
}

export async function fetchMapSource(
  sourceID: number
): Promise<MapSourceRef | null> {
  try {
    const sources = await fetchAPIData("/defs/sources", {
      source_id: sourceID,
    });
    const source = sources?.[0];
    if (source == null) return null;
    return {
      source_id: source.source_id,
      name: source.name,
      ref_title: source.ref_title ?? null,
      authors: source.authors ?? null,
      ref_year: source.ref_year ?? null,
      url: source.url ?? null,
      scale: source.scale ?? null,
    };
  } catch (err) {
    console.warn("[homepage] map source lookup failed:", err?.message ?? err);
    return null;
  }
}
