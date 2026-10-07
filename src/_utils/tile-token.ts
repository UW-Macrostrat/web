/** The tile token the browser sends with guarded tile requests, kept fresh.
 *
 * The server mints one per page (`./tile-token.server.ts`) and hands it over in
 * `pageContext.tileToken`; `ensureTileToken` takes it from there on hydration
 * and on every client-side navigation. A map page can stay open for hours
 * without either, so the token is also refreshed from `/auth/_tile-token`:
 *
 *   - on a timer, `REFRESH_MARGIN` before it expires;
 *   - when the tab becomes visible or regains focus and the token is close to
 *     expiry (`watchTileToken`, installed once after hydration), since a
 *     background tab's timers are throttled and a sleeping laptop skips them
 *     entirely;
 *   - when a tile has already failed with a 401 (`TileTokenRecovery`).
 *
 * A plain module, not React state: `tileRequestTransform` reads it on every tile
 * request, outside any component, so a refreshed token applies to the next
 * request with nothing to re-render.
 */

export interface TileToken {
  token: string;
  /** Epoch milliseconds. Absolute rather than relative because the page that
   * carried it may have been served from a cache. */
  expiresAt: number;
}

/** How long before expiry a token is replaced. */
const REFRESH_MARGIN = 10 * 60 * 1000;

let current: TileToken | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let inflight: Promise<string | null> | null = null;

/** The current token, or null before one has arrived. */
export function getTileToken(): string | null {
  return current?.token ?? null;
}

/** Hold a usable token: the page's, if it is fresher than the one held, and a
 * newly fetched one if what is held is nearly spent -- a page served from a
 * cache can carry a token that is. Called on every render. A page with no token
 * came from a server that cannot mint, so there is nothing to fetch. */
export function ensureTileToken(pageToken: TileToken | null | undefined) {
  if (typeof window === "undefined") return;
  if (pageToken == null && current == null) return;
  if (pageToken != null && isFresher(pageToken)) accept(pageToken);
  if (isNearExpiry()) void refreshTileToken();
}

/** Refresh on returning to the tab, where the timer may not have fired. Install
 * once; the listeners live as long as the page. */
export function watchTileToken() {
  const check = () => {
    if (document.visibilityState !== "visible") return;
    if (isNearExpiry()) void refreshTileToken();
  };
  document.addEventListener("visibilitychange", check);
  window.addEventListener("focus", check);
}

/** Fetch a new token. Concurrent callers share one request; resolves with the
 * token held afterwards, which is the old one if the request failed. */
export async function refreshTileToken(): Promise<string | null> {
  inflight ??= requestTileToken();
  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

async function requestTileToken(): Promise<string | null> {
  try {
    const res = await fetch("/auth/_tile-token", { cache: "no-store" });
    if (res.ok) {
      const body = await res.json();
      if (body?.token != null) {
        // Relative on the way in, so this browser's clock is all that matters.
        accept({
          token: body.token,
          expiresAt: Date.now() + body.expires_in * 1000,
        });
      }
    }
  } catch (error) {
    console.error("[tiles] Error fetching tile token:", error);
  }
  return getTileToken();
}

function accept(token: TileToken) {
  current = token;
  if (timer != null) clearTimeout(timer);
  const delay = Math.max(token.expiresAt - Date.now() - REFRESH_MARGIN, 0);
  timer = setTimeout(() => void refreshTileToken(), delay);
}

function isFresher(token: TileToken) {
  return current == null || token.expiresAt > current.expiresAt;
}

function isNearExpiry() {
  if (current == null) return true;
  return current.expiresAt - Date.now() < REFRESH_MARGIN;
}
