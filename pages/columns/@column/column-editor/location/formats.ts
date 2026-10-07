/** The coordinate formats a location can be typed in.
 *
 * A person says which format they have and types it; the editor reads it,
 * says back what it understood, and places the point. No guessing at
 * free-form text: each format has a documented shape (see the site's
 * "Column locations" documentation page), and the parsers come from the
 * `geodesy` library — Chris Veness's, with its documented handling of
 * degrees-minutes-seconds spellings, UTM (WGS84) and the MGRS grid.
 *
 * Pure functions. The UI is in `location-editor.ts`. */
import Dms from "geodesy/dms.js";
import Utm, { LatLon as LatLonUtm } from "geodesy/utm.js";
import Mgrs, { LatLon as LatLonMgrs } from "geodesy/mgrs.js";
import { roundCoordinate, type LngLat } from "./geometry";

export type CoordinateFormat = "decimal" | "dms" | "utm" | "mgrs" | "wkt";

export interface CoordinateFormatDef {
  id: CoordinateFormat;
  label: string;
  /** One line on what the field takes. */
  hint: string;
  example: string;
}

export const COORDINATE_FORMATS: CoordinateFormatDef[] = [
  {
    id: "decimal",
    label: "Decimal degrees",
    hint: "Latitude, then longitude; south and west negative.",
    example: "43.0731, -89.4012",
  },
  {
    id: "dms",
    label: "Degrees, minutes, seconds",
    hint: "Latitude then longitude, each with N/S or E/W; minutes and seconds optional.",
    example: "43°04′23″N, 89°24′04″W",
  },
  {
    id: "utm",
    label: "UTM",
    hint: "Zone, band letter or hemisphere, easting, northing — WGS84.",
    example: "16T 305000 4771000",
  },
  {
    id: "mgrs",
    label: "MGRS / USNG",
    hint: "Grid zone, 100 km square, easting and northing — WGS84.",
    example: "16T BN 05000 71000",
  },
  {
    id: "wkt",
    label: "WKT point",
    hint: "POINT(longitude latitude), as a GIS writes it.",
    example: "POINT(-89.4012 43.0731)",
  },
];

export type ParsedCoordinates =
  | { ok: true; point: LngLat; echo: string }
  | { ok: false; error: string };

/** Read `text` in `format`. The echo says what was understood, in decimal
 * degrees, with what the format added (the UTM zone, the grid square). */
export function parseCoordinates(
  format: CoordinateFormat,
  text: string
): ParsedCoordinates {
  const raw = text.trim();
  if (raw === "") return { ok: false, error: "Nothing to read." };
  try {
    switch (format) {
      case "decimal":
        return parseDecimal(raw);
      case "dms":
        return parseDMS(raw);
      case "utm":
        return parseUTM(raw);
      case "mgrs":
        return parseMGRS(raw);
      case "wkt":
        return parseWKT(raw);
    }
  } catch (err: any) {
    return { ok: false, error: err?.message ?? String(err) };
  }
}

function checked(lat: number, lng: number, what: string): ParsedCoordinates {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { ok: false, error: `Couldn't read two numbers as ${what}.` };
  }
  if (Math.abs(lat) > 90) return { ok: false, error: `Latitude ${lat} is out of range.` };
  if (Math.abs(lng) > 180) return { ok: false, error: `Longitude ${lng} is out of range.` };
  const point = { lat: roundCoordinate(lat), lng: roundCoordinate(lng) };
  return { ok: true, point, echo: `${what}: ${describe(point)}` };
}

/** `43.0731°N, 89.4012°W` */
export function describe(p: LngLat): string {
  const ns = p.lat >= 0 ? "N" : "S";
  const ew = p.lng >= 0 ? "E" : "W";
  return `${Math.abs(p.lat).toFixed(4)}°${ns}, ${Math.abs(p.lng).toFixed(4)}°${ew}`;
}

/* --------------------------------------------------------------- formats */

function parseDecimal(raw: string): ParsedCoordinates {
  const parts = raw.split(/[,;\s]+/).filter(Boolean);
  if (parts.length !== 2) {
    return { ok: false, error: "Give two numbers: latitude, then longitude." };
  }
  return checked(Number(parts[0]), Number(parts[1]), "Decimal degrees");
}

/** Two DMS values. Split on a comma or semicolon; else after the first
 * N/S letter, so `43°04′N 89°24′W` works without one. */
function parseDMS(raw: string): ParsedCoordinates {
  let parts = raw.split(/[,;]/).map((d) => d.trim()).filter(Boolean);
  if (parts.length !== 2) {
    const m = raw.match(/^(.*?[NS])\s+(.*)$/i);
    if (m == null) {
      return {
        ok: false,
        error: "Give latitude then longitude, each ending in N/S or E/W.",
      };
    }
    parts = [m[1], m[2]];
  }
  const [latText, lngText] = parts;
  if (!/[NS]\s*$/i.test(latText) || !/[EW]\s*$/i.test(lngText)) {
    return {
      ok: false,
      error: "Latitude must end in N or S and longitude in E or W.",
    };
  }
  const lat = Dms.parse(latText);
  const lng = Dms.parse(lngText);
  return checked(lat, lng, "DMS");
}

/** Zone, then a hemisphere (N/S) or a latitude band letter (C–X), then
 * easting and northing. A band letter is turned into the hemisphere
 * `geodesy` wants. */
function parseUTM(raw: string): ParsedCoordinates {
  const m = raw
    .toUpperCase()
    .match(/^(\d{1,2})\s*([A-Z])\s+([\d.]+)\s*[,;]?\s*([\d.]+)$/);
  if (m == null) {
    return {
      ok: false,
      error: "Give zone, band or hemisphere, easting and northing, e.g. 16T 305000 4771000.",
    };
  }
  const [, zone, letter, easting, northing] = m;
  let hemisphere = letter;
  if (letter !== "N" && letter !== "S") {
    if (letter < "C" || letter > "X" || letter === "I" || letter === "O") {
      return { ok: false, error: `${letter} is not a latitude band.` };
    }
    hemisphere = letter >= "N" ? "N" : "S";
  }
  const utm = Utm.parse(`${zone} ${hemisphere} ${easting} ${northing}`);
  const ll = utm.toLatLon();
  return checked(ll.lat, ll.lon, `UTM zone ${zone}${hemisphere}`);
}

function parseMGRS(raw: string): ParsedCoordinates {
  const ref = Mgrs.parse(raw.toUpperCase());
  const ll = ref.toUtm().toLatLon();
  return checked(ll.lat, ll.lon, `MGRS ${ref.zone}${ref.band} ${ref.e100k}${ref.n100k}`);
}

function parseWKT(raw: string): ParsedCoordinates {
  const m = raw.match(/^POINT\s*\(\s*([-+\d.]+)\s+([-+\d.]+)\s*\)$/i);
  if (m == null) {
    return { ok: false, error: "Give POINT(longitude latitude)." };
  }
  return checked(Number(m[2]), Number(m[1]), "WKT point");
}

/* ----------------------------------------------------------------- output */

/** A point written back in a format, for copying out. */
export function formatCoordinates(format: CoordinateFormat, p: LngLat): string {
  switch (format) {
    case "decimal":
      return `${roundCoordinate(p.lat)}, ${roundCoordinate(p.lng)}`;
    case "dms":
      return `${Dms.toLat(p.lat, "dms", 1)}, ${Dms.toLon(p.lng, "dms", 1)}`;
    case "utm":
      return new LatLonUtm(p.lat, p.lng).toUtm().toString(0);
    case "mgrs":
      return new LatLonMgrs(p.lat, p.lng).toUtm().toMgrs().toString(10);
    case "wkt":
      return `POINT(${roundCoordinate(p.lng)} ${roundCoordinate(p.lat)})`;
  }
}
