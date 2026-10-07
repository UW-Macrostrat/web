/** Saving a column's footprint on its own (`PATCH /columns/:id/geometry`),
 * apart from the rest of the editing session. The backend stores the point
 * and the region; a line or an uncertainty radius is accepted and reported
 * back as a warning, since there is nowhere to keep it yet. */
import { apiV3Prefix } from "@macrostrat-web/settings";
import type { IngestNotice } from "../ingest-api";
import { EMPTY_FOOTPRINT, type Footprint } from "./geometry";

export interface GeometrySaveResult {
  col_id: number;
  lat: number;
  lng: number;
  col_area: number;
  notices: IngestNotice[];
}

/** The parts of the location the backend can't store yet. */
export function unstoredParts(footprint: Footprint): string[] {
  const { kind, line, radius_km } = footprint.location;
  const parts: string[] = [];
  if (kind === "line" && line != null) parts.push("line");
  if (kind === "point" && (radius_km ?? 0) > 0) parts.push("uncertainty radius");
  return parts;
}

/** The footprint as the backend keeps it: the point and the region. */
export function storedFootprint(footprint: Footprint): Footprint {
  return {
    location: { ...EMPTY_FOOTPRINT.location, point: footprint.location.point },
    region: footprint.region,
  };
}

function geometryUpdate(footprint: Footprint) {
  const { kind, point, line, radius_km } = footprint.location;
  const body: Record<string, any> = { region: footprint.region };
  if (point != null) {
    body.point = { type: "Point", coordinates: [point.lng, point.lat] };
  }
  if (kind === "line" && line != null) body.line = line;
  if (kind === "point" && (radius_km ?? 0) > 0) body.radius_km = radius_km;
  return body;
}

export async function saveColumnGeometry(
  col_id: number,
  footprint: Footprint
): Promise<GeometrySaveResult> {
  const res = await fetch(`${apiV3Prefix}/columns/${col_id}/geometry`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(geometryUpdate(footprint)),
  });
  if (!res.ok) throw new Error(await errorDetail(res));
  return res.json();
}

/** FastAPI's `detail` when it is a message, else the raw response. */
async function errorDetail(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const detail = JSON.parse(text)?.detail;
    if (typeof detail === "string") return detail;
  } catch {
    // Not JSON
  }
  return `Save failed (${res.status}): ${text}`;
}
