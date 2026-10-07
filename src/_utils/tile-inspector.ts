/** Links between the main map and the tile inspector (`/dev/map/inspector`).
 *
 * The two pages describe a view the same way — the camera in the hash as
 * `x`/`y`/`z`, and the compilation by slug (absent for `carto`) — but `/map`
 * keeps its compilation in the hash and its info marker in the path
 * (`/map/loc/lng/lat`), while the inspector keeps both in the query string.
 */

import { mapPagePrefix } from "@macrostrat-web/settings";
import { formatCoordForZoomLevel } from "@macrostrat/mapbox-utils";
import { buildQueryString, getHashString } from "@macrostrat/ui-components";

import { DEFAULT_COMPILATION } from "./compilations";
import { hashWithMapPosition } from "./map-position";

export const tileInspectorPath = "/dev/map/inspector";

interface LngLat {
  lng: number;
  lat: number;
}

/** ~1 m, past the resolution of any Macrostrat dataset. */
function roundCoord(value: number): number {
  return Math.round(value * 1e5) / 1e5;
}

/** The inspector, centered on and inspecting a point. */
export function tileInspectorHref({
  compilation,
  position,
  zoom,
}: {
  compilation: string | null;
  position: LngLat;
  zoom: number | null;
}): string {
  const params = new URLSearchParams();
  if (compilation != null && compilation != DEFAULT_COMPILATION) {
    params.set("compilation", compilation);
  }
  const lng = roundCoord(position.lng);
  const lat = roundCoord(position.lat);
  params.set("pin", `${lng},${lat}`);

  const hash = hashWithMapPosition("", {
    camera: { lng, lat, bearing: 0, pitch: 0 },
    target: { lng, lat, zoom: zoom ?? 7 },
  });

  return `${tileInspectorPath}?${params.toString()}#${hash}`;
}

/** The main map at the inspected point (or just the camera, in `hash`), on the
 * same compilation. */
export function mainMapHref({
  compilation,
  pin,
  hash,
}: {
  compilation: string | null;
  pin: LngLat | null;
  hash: string;
}): string {
  const args = getHashString(hash) ?? {};
  if (compilation != null && compilation != DEFAULT_COMPILATION) {
    args["compilation"] = compilation;
  }
  const hashString = buildQueryString(args, {
    sort: false,
    arrayFormat: "comma",
  });

  let path = mapPagePrefix;
  if (pin != null) {
    const z = Number(args["z"] ?? 7);
    const ln = formatCoordForZoomLevel(pin.lng, z);
    const lt = formatCoordForZoomLevel(pin.lat, z);
    path += `/loc/${ln}/${lt}`;
  }
  return `${path}#${hashString}`;
}
