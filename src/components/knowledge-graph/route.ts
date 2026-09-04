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

/** Comma-separated `autoselect` query parameter → entity names to pre-select. */
export function autoSelectFromSearch(search: Record<string, string> | undefined) {
  const raw = search?.autoselect;
  if (raw == null || raw === "") return [];
  return raw.split(",").filter(Boolean);
}
