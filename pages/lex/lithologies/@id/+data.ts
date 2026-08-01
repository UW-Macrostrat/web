import { fetchLexCore, fetchLexRefs, lexTypeConfig } from "~/components/lex/data-loaders";

/**
 * Server-side load for the lithology detail page: core descriptive record +
 * references only. Heavy/derived data (column & fossil GeoJSON, prevalent taxa,
 * related units/maps presence) is loaded client-side via loadable atoms — see
 * `~/components/lex/item-atoms`. Keeping this lean makes SSR fast and stops the
 * heavy GeoJSON from being serialized into `pageContext` on every navigation.
 */
export async function data(pageContext) {
  const id = parseInt(pageContext.routeParams.id);

  if (isNaN(id)) {
    throw new Error("Invalid lithology ID in URL.");
  }

  const cfg = lexTypeConfig("lithologies");

  const [resData, refs] = await Promise.all([
    fetchLexCore(cfg, id),
    fetchLexRefs(cfg, id),
  ]);

  return { resData, refs };
}
