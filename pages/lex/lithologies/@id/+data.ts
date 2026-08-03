import { fetchLexData } from "~/components/lex/data-loaders";

/** Core descriptive record only; refs + heavy/derived data load client-side via
 * `~/components/lex/item-atoms`. See [[Geologic lexicon pages]]. */
export async function data(pageContext) {
  return await fetchLexData(pageContext, "lithologies");
}
