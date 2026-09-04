import { redirect } from "vike/abort";
import { searchParams } from "~/components/knowledge-graph/route";

/** The knowledge-graph pages used to live under `/integrations/xdd/` (xDD is
 * the literature platform that supplies the text; the system itself is
 * Macrostrat's knowledge graph). Old links — from the lexicon, docs, and
 * bookmarks — redirect to the new routes, query string intact. */
const LEGACY_ROUTES: [RegExp, string][] = [
  [/^\/integrations\/xdd\/extractions\/?$/, "/ext/kg/papers"],
  [/^\/integrations\/xdd\/extractions\/([^/]+)\/?$/, "/ext/kg/papers/$1"],
  [/^\/integrations\/xdd\/feedback\/?$/, "/ext/kg/source-texts"],
  [/^\/integrations\/xdd\/feedback\/(\d+)\/?$/, "/ext/kg/source-texts/$1"],
  [/^\/integrations\/xdd\/feedback\/(\d+)\/human\/?$/, "/ext/kg/source-texts/$1/reviews"],
  [/^\/integrations\/xdd\/sources\/(\d+)\/?$/, "/ext/kg/source-texts/$1"],
  [/^\/integrations\/xdd\/runs\/?$/, "/ext/kg/runs"],
  [/^\/integrations\/xdd\/types\/?$/, "/ext/kg/entity-types"],
];

export function guard(pageContext) {
  const path: string = pageContext.urlPathname ?? "";
  const query = searchParams(pageContext).toString();
  let search = "";
  if (query !== "") search = `?${query}`;
  for (const [pattern, target] of LEGACY_ROUTES) {
    if (pattern.test(path)) {
      throw redirect(path.replace(pattern, target) + search);
    }
  }
  throw redirect("/ext/kg");
}
