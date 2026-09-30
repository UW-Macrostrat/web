/** Short-lived tile tokens, minted by the web server for its own visitors.
 *
 * Compilations other than `carto` are guarded on the tileserver (`tiles:map`).
 * Rather than ship one long-lived delegated token in the bundle -- which anyone
 * can lift, and which has to be set in CI -- the server signs a JWT per page
 * that the tileserver verifies without a database lookup: HS256 over
 * `TILESERVER_SECRET_KEY`, audience `tileserver`, expiring in an hour. The
 * client keeps it fresh (`./tile-token.ts`).
 *
 * `TILESERVER_SECRET_KEY` is the tileserver's own key, never `SECRET_KEY`, which
 * signs login sessions. Where it is unset (local development) it is derived from
 * `SECRET_KEY` exactly as `macrostrat up` derives the tileserver's copy
 * (`compose_env.py`), so a local stack needs no second secret.
 */

import { createHmac } from "node:crypto";
import * as jose from "jose";

import type { TileToken } from "./tile-token";

/** Seconds a token is good for. The client refreshes well before. */
export const TILE_TOKEN_LIFETIME = 60 * 60;

const SCOPE = "tiles:map";
const AUDIENCE = "tileserver";
/** Must match `TILESERVER_KEY_LABEL` in the macrostrat CLI. */
const DERIVATION_LABEL = "macrostrat:tileserver-secret-key:v1";

let warnedMissingKey = false;

function signingKey(): Uint8Array | null {
  let key = process.env.TILESERVER_SECRET_KEY;
  if (!key) {
    const secretKey = process.env.SECRET_KEY;
    if (!secretKey) {
      if (!warnedMissingKey) {
        warnedMissingKey = true;
        console.warn(
          "[tiles] Neither TILESERVER_SECRET_KEY nor SECRET_KEY is set, so no " +
            "tile tokens are minted; compilations access falls back to " +
            "MACROSTRAT_MAP_TILES_TOKEN, if that is set."
        );
      }
      return null;
    }
    key = createHmac("sha256", secretKey)
      .update(DERIVATION_LABEL)
      .digest("hex");
  }
  return new TextEncoder().encode(key);
}

/** A fresh token, or null where the server has no key to sign with. */
export async function mintTileToken(): Promise<TileToken | null> {
  const key = signingKey();
  if (key == null) return null;
  const now = Math.floor(Date.now() / 1000);
  const expires = now + TILE_TOKEN_LIFETIME;
  const token = await new jose.SignJWT({ scope: SCOPE })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setAudience(AUDIENCE)
    .setIssuedAt(now)
    .setExpirationTime(expires)
    .sign(key);
  return { token, expiresAt: expires * 1000 };
}
