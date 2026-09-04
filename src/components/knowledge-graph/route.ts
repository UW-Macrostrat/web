/** Route-parameter helpers for `+data` hooks. `routeParams` is not reliable in
 * `data()` on a direct server render (it is in components and on client-routed
 * navigations), so fall back to the URL path — see [[Geologic lexicon pages]],
 * lesson 3. */

export function routeSegment(
  ctx: any,
  name: string,
  index: number
): string | null {
  const fromParams = ctx?.routeParams?.[name];
  if (fromParams != null && fromParams !== "") return String(fromParams);
  const segments = (ctx?.urlPathname ?? "").split("/").filter(Boolean);
  return segments[index] ?? null;
}

export function numericRouteSegment(
  ctx: any,
  name: string,
  index: number
): number | null {
  const raw = routeSegment(ctx, name, index);
  if (raw == null) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

/** The request's query string.
 *
 * `urlParsed` is not in this app's `passToClient` list, so it is present while
 * rendering on the server and gone after hydration — a value read only from the
 * page context is silently empty in the browser. Falls back to the live
 * location, which is where the client-side value actually lives. */
export function searchParams(ctx: any): URLSearchParams {
  const fromContext = ctx?.urlParsed?.searchOriginal;
  if (fromContext != null && fromContext !== "") {
    return new URLSearchParams(fromContext);
  }
  if (typeof window !== "undefined") {
    return new URLSearchParams(window.location.search);
  }
  return new URLSearchParams();
}

/** The query string as Vike's `searchOriginal` (`"?q=shale"`), or undefined when
 * there is none — the shape `initialViewStateFromURL` expects, where undefined
 * means "read the current location" and `""` would mean "no filters". */
export function searchOriginal(ctx: any): string | undefined {
  const search = searchParams(ctx).toString();
  if (search === "") return undefined;
  return `?${search}`;
}

/** Comma-separated `autoselect` query parameter → entity names to pre-select.
 * Consumed by the lexicon's "view source" links. */
export function autoSelectFromSearch(ctx: any): string[] {
  const raw = searchParams(ctx).get("autoselect");
  if (raw == null || raw === "") return [];
  return raw.split(",").filter(Boolean);
}
