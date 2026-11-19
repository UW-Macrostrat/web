/** The layer's display name, for the page title and breadcrumbs. Read from the
 * tileserver with the page's own tile token; a failure falls back to the slug. */
import type { PageContextServer } from "vike/types";
import { burwellTileDomain } from "@macrostrat-web/settings";

export async function data(pageContext: PageContextServer) {
  const layer = String(pageContext.routeParams.layer);
  return { name: await fetchLayerName(layer, pageContext.tileToken?.token) };
}

async function fetchLayerName(
  layer: string,
  token: string | undefined
): Promise<string | null> {
  const headers: Record<string, string> = {};
  if (token != null) headers.Authorization = `Bearer ${token}`;
  try {
    const url = `${burwellTileDomain}/rasters/layer/${encodeURIComponent(
      layer
    )}/layer`;
    const response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return null;
    const body = await response.json();
    return body.name ?? null;
  } catch {
    return null;
  }
}
