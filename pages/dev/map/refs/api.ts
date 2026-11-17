import { apiV3Prefix } from "@macrostrat-web/settings";
import type { FeatureCollection, Geometry } from "geojson";

/** A row of api-v3 `/refs`: the citation and the shape of its geometry. */
export interface Reference {
  id: number;
  pub_year: number;
  author: string;
  ref: string;
  doi: string | null;
  url: string | null;
  compilation_code: string;
  n_strat_names: number;
  geom_type: string | null;
  n_points: number | null;
  srid: number | null;
  bbox: [number, number, number, number] | null;
  is_valid: boolean | null;
  invalid_reason: string | null;
}

export type ReferenceCollection = FeatureCollection<Geometry, Reference>;

export async function fetchRefs(): Promise<Reference[]> {
  return await fetchJSON(`${apiV3Prefix}/refs`);
}

/** The references that have a geometry, as stored. */
export async function fetchRefGeometries(
  signal?: AbortSignal
): Promise<ReferenceCollection> {
  return await fetchJSON(`${apiV3Prefix}/refs.geojson?has_geom=true`, signal);
}

async function fetchJSON(url: string, signal?: AbortSignal) {
  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`Could not load references: ${res.statusText}`);
  }
  return await res.json();
}

export interface Problem {
  label: string;
  intent: "danger" | "warning" | "none";
}

/** What is wrong with a reference's geometry, worst first. */
export function problemsOf(ref: Reference): Problem[] {
  if (ref.geom_type == null) return [{ label: "No geometry", intent: "none" }];
  const problems: Problem[] = [];
  if (ref.is_valid === false) problems.push({ label: "Invalid", intent: "danger" });
  if (ref.srid !== 4326) problems.push({ label: `SRID ${ref.srid}`, intent: "warning" });
  return problems;
}

/** The location `ST_IsValidReason` reports, e.g. `Self-intersection[171.2 -36.8]`. */
export function invalidLocation(ref: Reference): [number, number] | null {
  const match = ref.invalid_reason?.match(/\[(-?[\d.]+) (-?[\d.]+)\]/);
  if (match == null) return null;
  return [parseFloat(match[1]), parseFloat(match[2])];
}
