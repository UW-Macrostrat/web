import { fetchLexData } from "~/components/lex/data-loaders.ts";
import { fetchIntervalWindow } from "~/components/lex/timescale-data";

/** Core descriptive record only; refs + heavy/derived data load client-side via
 * `~/components/lex/item-atoms`. See [[Geologic lexicon pages]]. The
 * intervals around this one are core too: they are the timescales' content. */
export async function data(pageContext) {
  const lexData = await fetchLexData(pageContext, "intervals");
  const windowIntervals = await fetchIntervalWindow(lexData.resData);
  return { ...lexData, windowIntervals };
}
