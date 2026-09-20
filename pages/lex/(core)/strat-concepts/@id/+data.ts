import {
  fetchConceptUsages,
  fetchLexData,
} from "~/components/lex/data-loaders.ts";

/** Core descriptive record plus the concept's member names; refs and the heavy
 * map/chart data still load client-side via `~/components/lex/item-atoms`.
 *
 * The usages are here rather than in a client effect because they *are* this
 * page's content — a concept is a grouping, so the names it groups are the
 * thing you came for, and they belong in the server HTML.
 * See [[Geologic lexicon pages]]. */
export async function data(pageContext) {
  const core = await fetchLexData(pageContext, "strat-concepts");
  const usages = await fetchConceptUsages(core.id);
  return { ...core, usages };
}
