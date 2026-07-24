// Auth imports
import * as jose from "jose";
import { PageContextServer } from "vike/types";
import maxmind, { type CityResponse, type Reader } from "maxmind";
import type { GeoLocation } from "~/_utils/geolocation";

// This hook is called upon new incoming HTTP requests
export async function onCreatePageContext(pageContext: PageContextServer) {
  // Get user name from cookies

  const cookies = getCookies(pageContext.headers);
  pageContext.user = await getUserFromCookie(cookies);

  // Derive a coarse default map location from the client IP (GeoIP). Never
  // throws — any failure (no DB, no/private IP, lookup miss) yields null, and
  // the client falls back to the URL / last-viewed / hard-coded default.
  //
  // Scoped to the map app: it's the only consumer, and — unlike `user`, which is
  // cookie-gated so Varnish never caches it — geo is IP-derived, so a cookieless
  // anonymous response carrying geo could be cached and served to another user.
  // Keeping it off non-map responses bounds that to the map route, which Varnish
  // is configured to bypass (see default.vcl).
  if (pageContext.urlPathname?.startsWith("/map")) {
    pageContext.geo = await getGeoLocation(pageContext.headers);
  }

  return pageContext;
}

// --- GeoIP ------------------------------------------------------------------

// The reader is opened once per server process and reused (mmap-backed, fast).
let geoipReaderPromise: Promise<Reader<CityResponse> | null> | null = null;
let warnedGeoip = false;

function openGeoipReader(): Promise<Reader<CityResponse> | null> {
  const path = process.env.GEOIP_DB_PATH;
  if (!path) {
    if (!warnedGeoip) {
      warnedGeoip = true;
      console.warn(
        "[geoip] GEOIP_DB_PATH is not set; skipping GeoIP default location. " +
          "Point it at a GeoLite2-City .mmdb to enable.",
      );
    }
    return Promise.resolve(null);
  }
  return maxmind.open<CityResponse>(path).catch((e: any) => {
    if (!warnedGeoip) {
      warnedGeoip = true;
      console.warn(`[geoip] Could not open GeoIP DB at ${path}:`, e?.message ?? e);
    }
    return null;
  });
}

async function getGeoLocation(
  headers: Record<string, string>,
): Promise<GeoLocation | null> {
  const ip = getClientIP(headers);
  if (ip == null) return null;

  geoipReaderPromise ??= openGeoipReader();
  const reader = await geoipReaderPromise;
  if (reader == null) return null;

  try {
    const res = reader.get(ip);
    const lat = res?.location?.latitude;
    const lng = res?.location?.longitude;
    if (lat == null || lng == null) return null;
    // Mid-range zoom: city-level, but not so tight it looks like a claim of
    // precision we don't have.
    return { lng, lat, zoom: 8, source: "geoip" };
  } catch {
    return null;
  }
}

/** The real client IP, from the trusted X-Real-IP the nginx sidecar sets (see
 * tiger-macrostrat-config nginx real_ip config), falling back to the first
 * public entry in X-Forwarded-For. Private/loopback addresses are ignored. */
function getClientIP(headers: Record<string, string>): string | null {
  const realIP = headers["x-real-ip"]?.trim();
  if (realIP && isPublicIP(realIP)) return realIP;

  const xff = headers["x-forwarded-for"];
  if (xff) {
    for (const part of xff.split(",")) {
      const ip = part.trim();
      if (isPublicIP(ip)) return ip;
    }
  }
  return null;
}

function isPublicIP(ip: string): boolean {
  if (!ip) return false;
  // Normalize IPv4-mapped IPv6 (::ffff:a.b.c.d)
  const v4 = ip.startsWith("::ffff:") ? ip.slice("::ffff:".length) : ip;
  if (v4 === "127.0.0.1" || ip === "::1") return false;
  if (/^10\./.test(v4)) return false;
  if (/^192\.168\./.test(v4)) return false;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(v4)) return false;
  if (/^(fc|fd)/i.test(ip)) return false; // IPv6 unique-local
  if (/^fe80:/i.test(ip)) return false; // IPv6 link-local
  return true;
}

interface ExportData {
  value: string;
  definedAt: string;
}

// Only log each config problem once per server process to avoid spamming the
// console (this hook runs on every incoming request).
let warnedMissingSecret = false;
let warnedSecretMismatch = false;

async function getUserFromCookie(cookies: Record<string, string>) {
  // SECRET_KEY must match the value api_v3 uses to sign the auth JWT. Without
  // it the web server can't verify the token, so the user always looks logged out.
  const secretKey = process.env.SECRET_KEY;
  if (!secretKey) {
    if (!warnedMissingSecret) {
      warnedMissingSecret = true;
      console.error(
        "[auth] SECRET_KEY is not set in the web server environment. The web " +
          "app cannot verify the auth JWT minted by api_v3, so login will not " +
          "work. Add SECRET_KEY to your web .env, set to the SAME value api_v3 " +
          "uses.",
      );
    }
    return null;
  }

  // No cookie = the user isn't logged in so no error
  const authCookie = cookies?.["access_token"];
  if (!authCookie) return null;

  try {
    const secret = new TextEncoder().encode(secretKey);
    // api_v3 stores the cookie as `Bearer <jwt>`.
    const jwt = authCookie.startsWith("Bearer ")
      ? authCookie.slice("Bearer ".length)
      : authCookie;
    const res = await jose.jwtVerify(jwt, secret);
    return res.payload;
  } catch (e: any) {
    // if there's an expired token then the user just needs to log in again.
    if (e?.code === "ERR_JWT_EXPIRED") return null;

    // A signature failure means the web SECRET_KEY doesn't match
    // the one api_v3 signed the token with.
    if (e?.code === "ERR_JWS_SIGNATURE_VERIFICATION_FAILED") {
      if (!warnedSecretMismatch) {
        warnedSecretMismatch = true;
        console.error(
          "[auth] Auth token signature verification failed — the web " +
            "SECRET_KEY does not match the SECRET_KEY api_v3 used to sign the " +
            "JWT. Set both to the same value.",
        );
      }
      return null;
    }

    console.warn("[auth] Could not verify auth token:", e?.message ?? e);
    return null;
  }
}

function getCookies(headers: Record<string, string>): Record<string, string> {
  const cookieHeader = headers["cookie"];
  if (!cookieHeader) {
    return {};
  }
  return cookieHeader.split("; ").reduce((acc, cookie) => {
    const [key, value] = cookie.split("=");
    acc[key] = value.replace(/"/g, "");
    return acc;
  }, {});
}
