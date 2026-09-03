import { render } from "vike/abort";
import {
  fetchKGLookups,
  fetchPublication,
  fetchRuns,
  type KGLookups,
  type KGPublication,
  type KGRun,
  routeSegment,
} from "~/components/knowledge-graph";

export interface PaperPageData {
  paperId: string;
  publication: KGPublication;
  /** Model runs over this paper's source texts, in source-text order. */
  runs: KGRun[];
  lookups: KGLookups;
}

/** Everything the paper page shows is small JSON (citation + entity trees), so
 * it is fetched on the server and rendered into the HTML; only the interactive
 * entity viewer is a client island. */
export async function data(pageContext): Promise<PaperPageData> {
  // `/integrations/xdd/extractions/<paperId>`
  const paperId = routeSegment(pageContext, "paperId", 3);
  if (paperId == null) {
    throw render(404, "No paper specified");
  }

  const [publication, runs, lookups] = await Promise.all([
    fetchPublication(paperId),
    fetchRuns({ paperId, kind: "model" }),
    fetchKGLookups(),
  ]);

  if (publication == null) {
    throw render(404, `Paper ${paperId} has no extractions`);
  }

  return { paperId, publication, runs, lookups };
}
