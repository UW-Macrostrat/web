import { render } from "vike/abort";
import {
  type AdjacentSourceTexts,
  countHumanRuns,
  fetchAdjacentInPaper,
  fetchAdjacentSourceTexts,
  fetchKGLookups,
  fetchKGRows,
  fetchPublication,
  fetchRuns,
  fetchSourceText,
  type KGLookups,
  type KGPublication,
  type KGRun,
  type KGSourceText,
  numericRouteSegment,
} from "~/components/knowledge-graph";

export interface KGMapLegend {
  source_text_id: number;
  map_id: number;
  legend_id: number;
  legend_name: string;
}

export interface SourceTextPageData {
  mapLegends: KGMapLegend[];
  sourceText: KGSourceText;
  publication: KGPublication | null;
  /** Model runs a reviewer can correct. */
  modelRuns: KGRun[];
  humanRunCount: number;
  adjacent: AdjacentSourceTexts;
  lookups: KGLookups;
}

export async function data(pageContext): Promise<SourceTextPageData> {
  // `/ext/kg/source-texts/<id>`
  const id = numericRouteSegment(pageContext, "sourceTextID", 3);
  if (id == null) {
    throw render(404, "Source text ids are numbers");
  }

  const sourceText = await fetchSourceText(id);
  if (sourceText == null) {
    throw render(404, `Source text ${id} does not exist`);
  }

  // Texts that belong to a paper step through that paper ("text 3 of 12");
  // orphan texts step through the global queue.
  let publicationRequest: Promise<KGPublication | null> = Promise.resolve(null);
  let adjacentRequest = fetchAdjacentSourceTexts(id);
  if (sourceText.paper_id != null) {
    publicationRequest = fetchPublication(sourceText.paper_id);
    adjacentRequest = fetchAdjacentInPaper(id, sourceText.paper_id);
  }

  const [modelRuns, humanRunCount, adjacent, lookups, publication, mapLegends] =
    await Promise.all([
      fetchRuns({ sourceTextId: id, kind: "model", requireVersion: true }),
      countHumanRuns(id),
      adjacentRequest,
      fetchKGLookups(),
      publicationRequest,
      fetchKGRows<KGMapLegend>("kg_legend", {
        source_text_id: `eq.${id}`,
        select: "source_text_id,map_id,legend_id,legend_name",
        order: "map_id,legend_id",
      }),
    ]);

  return {
    mapLegends,
    sourceText,
    publication,
    modelRuns,
    humanRunCount,
    adjacent,
    lookups,
  };
}
