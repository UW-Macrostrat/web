import type { PageContextServer } from "vike/types";
import { fetchRegions, fetchRegionSources } from "./api";

/** Every region at once, without geometry, so the list and the map filter the
 * same set in memory. */
export async function data(pageContext: PageContextServer) {
  // Filters are read from the URL once; the server renders the same view
  const search = pageContext.urlParsed?.searchOriginal ?? "";
  try {
    const [regions, sources] = await Promise.all([
      fetchRegions(),
      fetchRegionSources(),
    ]);
    return { regions, sources, search, error: null };
  } catch (error) {
    // A dev page shouldn't 500 because the API is down
    console.error("Could not load regions:", error);
    return { regions: [], sources: [], search, error: String(error) };
  }
}
