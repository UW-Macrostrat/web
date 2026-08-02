import {
  fetchLexCore,
  lexTypeConfig,
  lexIdFromContext,
} from "~/components/lex/data-loaders";

/** Core descriptive record only; refs + heavy/derived data load client-side via
 * `~/components/lex/item-atoms`. See [[Geologic lexicon pages]]. */
export async function data(pageContext) {
  const id = lexIdFromContext(pageContext);
  if (isNaN(id)) {
    throw new Error("Invalid environment ID in URL.");
  }

  const cfg = lexTypeConfig("environments");
  const resData = await fetchLexCore(cfg, id);

  return { resData };
}
