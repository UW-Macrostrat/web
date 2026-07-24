/**
 * A coarse geographic default derived server-side (currently from GeoIP). Passed
 * to the client via `passToClient` and used as a fallback map center when the URL
 * and the last-viewed-location don't provide one. Deliberately low-precision — a
 * default view, not a claim about where the user actually is.
 */
export type GeoLocation = {
  lng: number;
  lat: number;
  zoom: number;
  source: "geoip";
};
