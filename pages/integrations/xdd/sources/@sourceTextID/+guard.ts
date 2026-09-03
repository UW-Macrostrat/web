import { redirect } from "vike/abort";

/** `/integrations/xdd/sources/<id>?…` was a third copy of the feedback viewer,
 * reached from lexicon "text extraction" matches. The feedback page renders the
 * same source text (and honors the same `autoselect` query parameter), so this
 * route now redirects there, query string intact. */
export function guard(pageContext) {
  const id = pageContext.routeParams?.sourceTextID;
  const search = pageContext.urlParsed?.searchOriginal ?? "";
  throw redirect(`/integrations/xdd/feedback/${id}${search}`);
}
