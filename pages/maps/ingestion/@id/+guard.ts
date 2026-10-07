import { redirect } from "vike/abort";
import type { PageContext } from "vike/types";
import { requireAuthorized } from "~/_utils/auth-guards";

export default function guard(pageContext: PageContext) {
  const { id } = pageContext.routeParams;

  if (!id || isNaN(Number(id))) {
    throw redirect(`/maps/ingestion`);
  }

  // A map in the queue is work in progress: the "view anything" tier. Its
  // edits go through the API, which requires an administrator.
  requireAuthorized(pageContext);
}
