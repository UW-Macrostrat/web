import {
  fetchLexData,
  fetchStratConcept,
} from "~/components/lex/data-loaders.ts";

/** Core descriptive record plus the concept this name belongs to; refs and the
 * heavy map/chart data still load client-side via `~/components/lex/item-atoms`.
 *
 * The concept is here rather than in a client effect so the "Concept" card is
 * server HTML — the mirror of the concept page's "Name" cards, which are.
 * See [[Geologic lexicon pages]]. */
export async function data(pageContext) {
  const core = await fetchLexData(pageContext, "strat-names");
  const concept = await fetchStratConcept(core.resData?.concept_id);
  return { ...core, concept };
}
