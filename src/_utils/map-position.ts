/** Opening a map page at the right place, the way the main map does it.
 *
 * The `/map` page resolves its camera from ordered sinks — the URL hash, then
 * the last-viewed position shared across every map page, then its own default
 * (then GeoIP, which only it has). Each standalone map page had been repeating
 * that by hand, and drifting: passing a center to `getMapPositionForHash`
 * changes the default zoom for a hash carrying `x`/`y` but no `z` from 2 to 7,
 * which reads as the map mysteriously opening zoomed in.
 *
 * See `pages/map/map-interface/app-state/hash-string.ts` for the main map's
 * copy of the same rules.
 */

import {
  applyMapPositionToHash,
  getMapPositionForHash,
} from "@macrostrat/map-interface";
import type { MapPosition } from "@macrostrat/mapbox-utils";
import { buildQueryString, getHashString } from "@macrostrat/ui-components";

import { readLastMapPosition } from "./last-map-position";

/** Whether the URL hash carries an explicit map position, which is what decides
 * if the lower-ranked sinks apply at all. */
export function hashHasMapPosition(hash: string): boolean {
  try {
    const hashData = getHashString(hash) ?? {};
    return hashData.x != null || hashData.y != null;
  } catch {
    return false;
  }
}

/**
 * The camera to open at: the URL hash, then the shared last-viewed position,
 * then the caller's default.
 *
 * `getMapPositionForHash` is given no center position, matching the main map.
 * Its center argument is only a fallback for a hash missing coordinates, and
 * passing one also moves the default zoom from 2 to 7 — so a hash that lost its
 * `z` opens zoomed in rather than zoomed out.
 */
export function initialMapPosition(fallback: MapPosition): MapPosition {
  if (typeof window === "undefined") return fallback;

  const hash = window.location.hash;
  if (!hashHasMapPosition(hash)) {
    return readLastMapPosition() ?? fallback;
  }
  return getMapPositionForHash(getHashString(hash) ?? {}, null);
}

/** `hash` with this camera written into it, in the main map's `x`/`y`/`z`
 * (plus `a`/`e`) form, leaving anything else in the hash alone.
 *
 * Returns the string rather than setting it: `setHashString` rebuilds the URL
 * from the pathname up and drops the query string, so a page with query params
 * has to route the write through whatever owns its URL.
 */
export function hashWithMapPosition(
  hash: string,
  position: MapPosition
): string {
  const args = getHashString(hash) ?? {};
  applyMapPositionToHash(args, position);
  return buildQueryString(args, { sort: false, arrayFormat: "comma" });
}
