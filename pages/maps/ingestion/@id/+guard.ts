import { redirect } from "vike/abort";
import type { PageContext } from "vike/types";
import { requireLogin } from "~/_utils/auth-guards";

export default function guard(pageContext: PageContext) {
  const { id } = pageContext.routeParams;

  if (!id || isNaN(Number(id))) {
    throw redirect(`/maps/ingestion`);
  }

  // Anonymous visitors go through the standard sign-in page and come back.
  requireLogin(pageContext);
}
