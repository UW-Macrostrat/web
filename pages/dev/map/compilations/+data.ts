/** The whole compilation graph, fetched once on the server.
 *
 * A few hundred nodes and edges (~250 kB uncompressed) — small enough that the
 * page is better served holding all of it than asking per level, and small
 * enough to seed into the HTML so the first render is the real list.
 */

import type { PageContextServer } from "vike/types";
import {
  emptyGraph,
  fetchCompilationGraph,
  type CompilationGraph,
} from "~/components/compilation-tree";

export async function data(pageContext: PageContextServer) {
  const graph = await fetchGraph();
  return { graph };
}

async function fetchGraph(): Promise<CompilationGraph> {
  try {
    return await fetchCompilationGraph();
  } catch (error) {
    // A dev page shouldn't 500 because the API is down — it renders its own
    // empty state, and the client retries on demand.
    console.error("Could not load the compilation graph:", error);
    return emptyGraph;
  }
}
