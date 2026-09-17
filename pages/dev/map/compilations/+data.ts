/** The whole compilation graph, fetched once on the server.
 *
 * A few hundred nodes and edges (~250 kB uncompressed) — small enough that the
 * page is better served holding all of it than asking per level, and small
 * enough to seed into the HTML so the first render is the real list.
 */

import { apiV3Prefix } from "@macrostrat-web/settings";
import type { PageContextServer } from "vike/types";
import { emptyGraph, type CompilationGraph } from "./graph";

export async function data(pageContext: PageContextServer) {
  const graph = await fetchGraph();
  return { graph };
}

async function fetchGraph(): Promise<CompilationGraph> {
  try {
    const res = await fetch(
      `${apiV3Prefix}/compilations`.replace(/\/$/, "") + "/graph"
    );
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } catch (error) {
    // A dev page shouldn't 500 because the API is down — it renders its own
    // empty state, and the client retries on demand.
    console.error("Could not load the compilation graph:", error);
    return emptyGraph;
  }
}
