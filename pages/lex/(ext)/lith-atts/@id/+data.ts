import { fetchLexData } from "~/components/lex/data-loaders.ts";

export async function data(pageContext) {
  return await fetchLexData(pageContext, "lith-atts");
}
