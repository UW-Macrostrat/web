/** Pure geometry for the location editor: the footprint model, a circle for
 * a location's uncertainty, WKT for export. No map, no React.
 *
 * A column's footprint has two independent parts:
 *
 * - its **location** — where the data were gathered. A point with an
 *   uncertainty radius (a locality, a core), or a line (a measured
 *   section's traverse). Meaningful for measured sections and drill cores.
 * - its **region** — the area the column stands for, as a polygon. What a
 *   composite column *is*; what a measured section may also claim to
 *   represent.
 *
 * A measured section can have both. Macrostrat's `cols` row holds a point
 * and a polygon; the radius and the line have nowhere to go yet. */
import type {
  Feature,
  FeatureCollection,
  LineString,
  MultiPolygon,
  Point,
  Polygon,
  Position,
} from "geojson";

export type LocationKind = "point" | "line";

export interface LngLat {
  lng: number;
  lat: number;
}

export interface ColumnLocation {
  kind: LocationKind;
  point: LngLat | null;
  /** Uncertainty radius, kilometres. */
  radius_km: number | null;
  line: LineString | null;
}

export interface Footprint {
  location: ColumnLocation;
  region: Polygon | MultiPolygon | null;
}

/** Which part of the footprint the map is drawing on. */
export type FootprintPart = "location" | "region";

export const EMPTY_FOOTPRINT: Footprint = {
  location: { kind: "point", point: null, radius_km: null, line: null },
  region: null,
};

/** The footprint a column arrives with: its stored point as the location,
 * its polygon as the region when it has an area. */
export function footprintFromColumn(
  columnInfo: any,
  region: Polygon | MultiPolygon | null
): Footprint {
  let point: LngLat | null = null;
  const lat = Number(columnInfo?.lat);
  const lng = Number(columnInfo?.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) point = { lng, lat };
  return {
    location: { kind: "point", point, radius_km: null, line: null },
    region,
  };
}

/** The location's geometry, or `null` when nothing is placed. */
export function locationGeometry(
  location: ColumnLocation
): Point | LineString | null {
  if (location.kind === "line") return location.line;
  if (location.point == null) return null;
  return { type: "Point", coordinates: [location.point.lng, location.point.lat] };
}

export function partGeometry(
  footprint: Footprint,
  part: FootprintPart
): Point | LineString | Polygon | MultiPolygon | null {
  if (part === "region") return footprint.region;
  return locationGeometry(footprint.location);
}

export function sameFootprint(a: Footprint, b: Footprint): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Five decimal places: about a metre, and past any Macrostrat dataset. */
export function roundCoordinate(value: number): number {
  return Math.round(value * 1e5) / 1e5;
}

export function formatLngLat(p: LngLat | null): string {
  if (p == null) return "";
  return `${roundCoordinate(p.lat)}, ${roundCoordinate(p.lng)}`;
}

/* ------------------------------------------------------------------ circle */

const EARTH_RADIUS_KM = 6371.0088;

/** A polygon approximating the circle of `radiusKm` around `center`, on
 * the sphere — the location's uncertainty, drawn. */
export function circlePolygon(center: LngLat, radiusKm: number, steps = 72): Polygon {
  const lat1 = (center.lat * Math.PI) / 180;
  const lng1 = (center.lng * Math.PI) / 180;
  const d = radiusKm / EARTH_RADIUS_KM;
  const ring: Position[] = [];
  for (let i = 0; i <= steps; i++) {
    const bearing = (2 * Math.PI * i) / steps;
    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(bearing)
    );
    const lng2 =
      lng1 +
      Math.atan2(
        Math.sin(bearing) * Math.sin(d) * Math.cos(lat1),
        Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
      );
    ring.push([
      roundCoordinate((lng2 * 180) / Math.PI),
      roundCoordinate((lat2 * 180) / Math.PI),
    ]);
  }
  return { type: "Polygon", coordinates: [ring] };
}

/** Great-circle length of a line, in kilometres. */
export function lineLengthKm(line: LineString | null): number {
  if (line == null) return 0;
  let total = 0;
  const coords = line.coordinates;
  for (let i = 1; i < coords.length; i++) {
    total += haversineKm(coords[i - 1], coords[i]);
  }
  return total;
}

function haversineKm(a: Position, b: Position): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/* --------------------------------------------------------------------- WKT */

function wktCoords(positions: Position[]): string {
  return positions.map((p) => `${p[0]} ${p[1]}`).join(", ");
}

export function toWKT(
  geometry: Point | LineString | Polygon | MultiPolygon | null
): string {
  if (geometry == null) return "";
  switch (geometry.type) {
    case "Point":
      return `POINT (${wktCoords([geometry.coordinates])})`;
    case "LineString":
      return `LINESTRING (${wktCoords(geometry.coordinates)})`;
    case "Polygon":
      return `POLYGON (${geometry.coordinates
        .map((ring) => `(${wktCoords(ring)})`)
        .join(", ")})`;
    case "MultiPolygon":
      return `MULTIPOLYGON (${geometry.coordinates
        .map((polygon) => `(${polygon.map((ring) => `(${wktCoords(ring)})`).join(", ")})`)
        .join(", ")})`;
  }
}

/** The footprint as GeoJSON for export: a location feature and a region
 * feature, each saying which part it is — what a write route would take. */
export function footprintFeatures(
  footprint: Footprint,
  col_id: number | null
): FeatureCollection {
  const features: Feature[] = [];
  const location = locationGeometry(footprint.location);
  if (location != null) {
    const properties: Record<string, any> = { col_id, part: "location" };
    if (footprint.location.kind === "point" && footprint.location.radius_km != null) {
      properties.radius_km = footprint.location.radius_km;
    }
    features.push({ type: "Feature", geometry: location, properties });
  }
  if (footprint.region != null) {
    features.push({
      type: "Feature",
      geometry: footprint.region,
      properties: { col_id, part: "region" },
    });
  }
  return { type: "FeatureCollection", features };
}

/** The number of vertices a geometry has, for the panel's note. */
export function vertexCount(
  geometry: LineString | Polygon | MultiPolygon | null
): number {
  if (geometry == null) return 0;
  if (geometry.type === "LineString") return geometry.coordinates.length;
  if (geometry.type === "Polygon") {
    return geometry.coordinates.reduce((n, ring) => n + ring.length - 1, 0);
  }
  return geometry.coordinates.reduce(
    (n, polygon) => n + polygon.reduce((m, ring) => m + ring.length - 1, 0),
    0
  );
}
