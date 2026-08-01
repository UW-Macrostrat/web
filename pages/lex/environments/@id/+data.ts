import { fetchLexCore, fetchLexRefs, lexTypeConfig } from "~/components/lex/data-loaders";

/** Core descriptive record + references only; heavy/derived data loads
 * client-side via `~/components/lex/item-atoms`. See [[Geologic lexicon pages]]. */
export async function data(pageContext) {
  const id = parseInt(pageContext.routeParams.id);
  if (isNaN(id)) {
    throw new Error("Invalid environment ID in URL.");
  }

  const cfg = lexTypeConfig("environments");
  const [resData, refs] = await Promise.all([
    fetchLexCore(cfg, id),
    fetchLexRefs(cfg, id),
  ]);

  return { resData, refs };
}
