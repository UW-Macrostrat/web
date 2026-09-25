/** The homepage hero as a cached map view: one snapshot per featured area.
 *
 * The hero opens as a still of its map — rendered by the snapshot route from
 * the very `HeroMap` the live hero uses — and becomes the live map only when
 * the reader reaches for it. See `@macrostrat-web/map-snapshots` for the machinery.
 */
import { fetchAPIData } from "~/_utils";
import type { MapSnapshotSpec } from "@macrostrat-web/map-snapshots";
import { areaByID, featuredAreas, type FeaturedArea } from "./featured-areas";
import { fetchColumnAtPoint, fetchColumnByID } from "./hero-data";
import {
  INTERNATIONAL_TIMESCALE_ID,
  timeRangeForSpec,
  type TimeRange,
} from "./time-range";

/** Bump when the hero map's *look* changes without any area changing — the
 * base style, the geology's opacities, the footprint's line. Every hero key
 * changes with it, so the page falls back to the cover photo rather than show
 * last week's styling until the renderer runs again. */
export const HERO_SNAPSHOT_VERSION = 1;

/** The largest the map cell gets: the full content width (no column beside
 * it) by the top of `--hero-height`'s clamp. The page shows the image
 * uncropped-and-unscaled from its centre (`object-fit: none`), and Mapbox keeps
 * the centre and the scale fixed as a container resizes — so any smaller cell
 * is a crop of this one, and the live map lands on the same pixels. (Nearly:
 * a pitched camera's perspective depends on the container's height.) */
export const HERO_SNAPSHOT_SIZE = { width: 970, height: 450 };

export const HERO_SNAPSHOT_PIXEL_RATIOS = [1, 2];

export function heroSnapshotSpec(area: FeaturedArea): MapSnapshotSpec {
  return {
    kind: "hero",
    id: area.id,
    ...HERO_SNAPSHOT_SIZE,
    pixelRatios: HERO_SNAPSHOT_PIXEL_RATIOS,
    params: {
      version: HERO_SNAPSHOT_VERSION,
      view: area.view,
      columnID: area.columnID ?? null,
      ageRange: area.ageRange ?? null,
    },
  };
}

export function heroSnapshotSpecs(): MapSnapshotSpec[] {
  return featuredAreas.map(heroSnapshotSpec);
}

/** What the snapshot route needs to draw an area exactly as the live hero
 * opens on it: the camera, the column's outline and the opening age filter. */
export interface HeroSnapshotData {
  area: FeaturedArea;
  footprint: GeoJSON.Feature | null;
  timeRange: TimeRange | null;
}

export async function heroSnapshotData(
  id: string
): Promise<HeroSnapshotData | null> {
  const area = areaByID(id);
  if (area == null) return null;

  let columnRequest;
  if (area.columnID != null) {
    columnRequest = fetchColumnByID(area.columnID);
  } else {
    columnRequest = fetchColumnAtPoint(area.view.lat, area.view.lng);
  }

  const [column, intervals] = await Promise.all([
    columnRequest,
    fetchTimescale(),
  ]);

  return {
    area,
    footprint: column?.footprint ?? null,
    timeRange: timeRangeForSpec(area.ageRange, intervals),
  };
}

/** The international timescale, keyed by id — what the live hero resolves an
 * area's named age range against. An interval outside it (the Precambrian)
 * resolves to no filter here; no featured area names one yet. */
async function fetchTimescale(): Promise<Map<number, any> | null> {
  try {
    const records = await fetchAPIData("/defs/intervals", {
      timescale_id: INTERNATIONAL_TIMESCALE_ID,
    });
    return new Map(records.map((r) => [r.int_id, r]));
  } catch (err) {
    console.warn("[map-snapshots] timescale unavailable:", err?.message ?? err);
    return null;
  }
}
