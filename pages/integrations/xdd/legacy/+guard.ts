import { redirect } from "vike/abort";

/** The knowledge-graph pages used to live under `/integrations/xdd/` (xDD is
 * the literature platform that supplies the text; the system itself is
 * Macrostrat's knowledge graph). Old links — from the lexicon, docs, and
 * bookmarks — redirect to the new routes, query string intact. */
const LEGACY_ROUTES: [RegExp, string][] = [
  [/^\/integrations\/xdd\/extractions\/?$/, "/knowledge-graph/papers"],
  [/^\/integrations\/xdd\/extractions\/([^/]+)\/?$/, "/knowledge-graph/papers/$1"],
  [/^\/integrations\/xdd\/feedback\/?$/, "/knowledge-graph/source-texts"],
  [/^\/integrations\/xdd\/feedback\/(\d+)\/?$/, "/knowledge-graph/source-texts/$1"],
  [/^\/integrations\/xdd\/feedback\/(\d+)\/human\/?$/, "/knowledge-graph/source-texts/$1/reviews"],
  [/^\/integrations\/xdd\/sources\/(\d+)\/?$/, "/knowledge-graph/source-texts/$1"],
  [/^\/integrations\/xdd\/runs\/?$/, "/knowledge-graph/runs"],
  [/^\/integrations\/xdd\/types\/?$/, "/knowledge-graph/entity-types"],
];

export function guard(pageContext) {
  const path: string = pageContext.urlPathname ?? "";
  const search: string = pageContext.urlParsed?.searchOriginal ?? "";
  for (const [pattern, target] of LEGACY_ROUTES) {
    if (pattern.test(path)) {
      throw redirect(path.replace(pattern, target) + search);
    }
  }
  throw redirect("/knowledge-graph");
}
