import { render } from "vike/abort";
import {
  fetchFeedbackNotesForRuns,
  fetchKGLookups,
  fetchRuns,
  fetchSourceText,
  type KGFeedbackNote,
  type KGLookups,
  type KGRun,
  type KGSourceText,
  numericRouteSegment,
} from "~/components/knowledge-graph";

export interface HumanFeedbackPageData {
  sourceText: KGSourceText;
  /** Reviewer-corrected runs, oldest first. */
  humanRuns: KGRun[];
  /** Notes keyed by run id (plain object: it crosses the server→client boundary). */
  notesByRun: Record<number, KGFeedbackNote>;
  lookups: KGLookups;
}

export async function data(pageContext): Promise<HumanFeedbackPageData> {
  // `/integrations/xdd/feedback/<id>/human`
  const id = numericRouteSegment(pageContext, "sourceTextID", 3);
  if (id == null) {
    throw render(404, "Source text ids are numbers");
  }
  const sourceText = await fetchSourceText(id);
  if (sourceText == null) {
    throw render(404, `Source text ${id} does not exist`);
  }

  const [humanRuns, lookups] = await Promise.all([
    fetchRuns({ sourceTextId: id, kind: "human" }),
    fetchKGLookups(),
  ]);
  const notes = await fetchFeedbackNotesForRuns(
    humanRuns.map((d) => d.model_run)
  );

  return {
    sourceText,
    humanRuns,
    notesByRun: Object.fromEntries(notes),
    lookups,
  };
}
