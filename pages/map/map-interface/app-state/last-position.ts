import type { MapPosition } from "@macrostrat/mapbox-utils";

/**
 * Persist the last-viewed map camera to localStorage so a return visit to `/map`
 * (with no position in the URL) resumes where the user left off. This is the
 * per-device "last-viewed-location" sink — ranked below explicit URL params and
 * above the GeoIP default. Not synced to the URL (that's the hash's job).
 */

const KEY = "macrostrat:map:last-position";

export function readLastPosition(): MapPosition | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw == null) return null;
    return JSON.parse(raw) as MapPosition;
  } catch {
    return null;
  }
}

export function writeLastPosition(pos: MapPosition | null): void {
  if (typeof localStorage === "undefined" || pos == null) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(pos));
  } catch {
    // Storage disabled or over quota — last-viewed is best-effort.
  }
}
