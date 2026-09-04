import { render } from "vike/abort";
import {
  fetchHumanRunCounts,
  fetchPublication,
  fetchSourceTexts,
  type KGPublication,
  type KGSourceText,
  routeSegment,
} from "~/components/knowledge-graph";

/** A source text row with its review count folded in. */
export interface PaperSourceText extends KGSourceText {
  n_reviews: number;
}

export interface PaperPageData {
  paperId: string;
  publication: KGPublication;
  /** The paper's source texts with run statistics — no entity trees. Each
   * row opens its own paragraph view/editor. */
  sourceTexts: PaperSourceText[];
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
  const rows = sourceTexts.map((d) => ({
    ...d,
    n_reviews: humanRunCounts[d.id] ?? 0,
  }));

  return { paperId, publication, sourceTexts: rows };
}
