import { render } from "vike/abort";
import {
  fetchHumanRunCounts,
  fetchPublication,
  fetchSourceTexts,
  type KGPublication,
  type KGSourceText,
  routeSegment,
} from "~/components/knowledge-graph";

export interface PaperPageData {
  paperId: string;
  publication: KGPublication;
  /** The paper's source texts with run statistics — no entity trees. Each
   * row links to its own paragraph view/editor. */
  sourceTexts: KGSourceText[];
  /** Human feedback runs per source text id. */
  humanRunCounts: Record<number, number>;
}

/** A summary of the paper: citation plus one row per source text. Papers can
 * have tens of paragraphs, so the entity trees are not loaded here; the
 * per-paragraph page (`/ext/kg/source-texts/<id>`) shows and edits them. */
export async function data(pageContext): Promise<PaperPageData> {
  // `/ext/kg/papers/<paperId>`
  const paperId = routeSegment(pageContext, "paperId", 3);
  if (paperId == null) {
    throw render(404, "No paper specified");
  }

  const [publication, sourceTexts] = await Promise.all([
    fetchPublication(paperId),
    fetchSourceTexts(paperId),
  ]);

  if (publication == null) {
    throw render(404, `Paper ${paperId} has no extractions`);
  }

  const humanRunCounts = await fetchHumanRunCounts(
    sourceTexts.map((d) => d.id)
  );

  return { paperId, publication, sourceTexts, humanRunCounts };
}
