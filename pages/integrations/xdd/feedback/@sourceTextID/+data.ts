import { render } from "vike/abort";
import {
  type AdjacentSourceTexts,
  countHumanRuns,
  fetchAdjacentSourceTexts,
  fetchKGLookups,
  fetchPublication,
  fetchRuns,
  fetchSourceText,
  type KGLookups,
  type KGPublication,
  type KGRun,
  type KGSourceText,
  numericRouteSegment,
} from "~/components/knowledge-graph";

export interface SourceTextPageData {
  sourceText: KGSourceText;
  publication: KGPublication | null;
  /** Model runs a reviewer can correct. */
  modelRuns: KGRun[];
  humanRunCount: number;
  adjacent: AdjacentSourceTexts;
  lookups: KGLookups;
}

export async function data(pageContext): Promise<SourceTextPageData> {
  // `/integrations/xdd/feedback/<id>`
  const id = numericRouteSegment(pageContext, "sourceTextID", 3);
  if (id == null) {
    throw render(404, "Source text ids are numbers");
  }

  const sourceText = await fetchSourceText(id);
  if (sourceText == null) {
    throw render(404, `Source text ${id} does not exist`);
  }

  let publicationRequest: Promise<KGPublication | null> = Promise.resolve(null);
  if (sourceText.paper_id != null) {
    publicationRequest = fetchPublication(sourceText.paper_id);
  }

  const [modelRuns, humanRunCount, adjacent, lookups, publication] =
    await Promise.all([
      fetchRuns({ sourceTextId: id, kind: "model", requireVersion: true }),
      countHumanRuns(id),
      fetchAdjacentSourceTexts(id),
      fetchKGLookups(),
      publicationRequest,
    ]);

  return { sourceText, publication, modelRuns, humanRunCount, adjacent, lookups };
}
