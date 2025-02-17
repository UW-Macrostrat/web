/**
 * Handlers for geographic lookup of IP addresses
 */

import geoip from "geoip-lite";
import process from "process";

export interface GeoIPResult {
  range: [number, number];
  country: string;
  region: string;
  city: string;
  // Center point latitude and longitude
  ll: [number, number];
  // Accuracy radius in kilometers
  area: number;
  eu: string;
  timezone: string;
  metro: number;
}

export function getGeoIPResult(
  ip: string,
  quiet: boolean = false
): GeoIPResult | null {
  if (!process.env.GEOIP_DATA_DIR) {
    if (quiet) {
      return null;
    }
    throw new Error("GEOIP_DATA_DIR not set");
  }

  return geoip.lookup(ip);
}
