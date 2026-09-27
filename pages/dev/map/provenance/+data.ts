/** The compilation graph, fetched once on the server — the same payload the
 * compilations page seeds from. It holds every ingested map, with
 * `superseded_by` on each, which is all the list needs. */

import type { PageContextServer } from "vike/types";
import {
  emptyGraph,
  fetchCompilationGraph,
  type CompilationGraph,
} from "~/components/compilation-tree";

export async function data(pageContext: PageContextServer) {
  let graph: CompilationGraph = emptyGraph;
  try {
    graph = await fetchCompilationGraph();
  } catch (error) {
    // A dev page shouldn't 500 because the API is down.
    console.error("Could not load the compilation graph:", error);
  }
  return { graph };
}
