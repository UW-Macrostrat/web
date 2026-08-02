import {
  fetchLexCore,
  lexTypeConfig,
  lexIdFromContext,
} from "~/components/lex/data-loaders";

/**
 * Server-side load for the lithology detail page: the core descriptive record
 * only. Everything else — references, column & fossil GeoJSON, taxa, related
 * units/maps — loads client-side via loadable atoms (`~/components/lex/item-atoms`).
 * References moved off the server because the `/columns`+`/fossils` ref merge is
 * slow for high-cardinality items and was erroring `pageContext` generation; see
 * [[Reference loading improvements]].
 */
export async function data(pageContext) {
  const id = lexIdFromContext(pageContext);
  if (isNaN(id)) {
    throw new Error("Invalid lithology ID in URL.");
  }

  const cfg = lexTypeConfig("lithologies");
  const resData = await fetchLexCore(cfg, id);

  return { resData };
}
