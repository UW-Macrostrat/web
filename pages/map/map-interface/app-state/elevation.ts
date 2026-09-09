import { apiV2Prefix } from "@macrostrat-web/settings";
import { LineString } from "geojson";
import { atom } from "jotai";
import { loadable } from "jotai/utils";
import { appStateAtom } from "./store.ts";

export interface ElevationPoint {
  lng: number;
  lat: number;
  /** Distance along the cross-section line, in km */
  d: number;
  /** Elevation in meters */
  elevation: number;
}

/** Coordinates come off a map click at full float precision, which makes for
 * absurdly long request URLs. The elevation model is nowhere near that
 * resolution, so trim to 5 decimal places (~1 m at the equator). This also
 * keeps the query key stable, so a line that is numerically unchanged doesn't
 * trigger a refetch. */
function formatCoord(value: number): string {
  return String(Number(value.toFixed(5)));
}

export const crossSectionLineAtom = atom<LineString | null>(
  (get) => get(appStateAtom)?.crossSectionLine ?? null
);

/** Query string for the elevation endpoint, or null if the line isn't complete
 * yet. Doubles as the cache key for the fetch below. */
const elevationQueryAtom = atom<string | null>((get) => {
  const coords = get(crossSectionLineAtom)?.coordinates ?? [];
  if (coords.length < 2) return null;
  const [start, end] = coords;
  return new URLSearchParams({
    start_lng: formatCoord(start[0]),
    start_lat: formatCoord(start[1]),
    end_lng: formatCoord(end[0]),
    end_lat: formatCoord(end[1]),
  }).toString();
});

const elevationDataAtom = atom<Promise<ElevationPoint[] | null>>(
  async (get, { signal }) => {
    const query = get(elevationQueryAtom);
    if (query == null) return null;
    const res = await fetch(`${apiV2Prefix}/elevation?${query}`, { signal });
    if (!res.ok) {
      throw new Error(`Elevation API request failed (${res.status})`);
    }
    const data = await res.json();
    return data?.success?.data ?? null;
  }
);

/** Loadable so consumers can render loading/error states without suspending. */
export const elevationProfileAtom = loadable(elevationDataAtom);
