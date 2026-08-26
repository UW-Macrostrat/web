import { redirect } from "vike/abort";
import { ingestPrefix } from "@macrostrat-web/settings";
import type { PageContext } from "vike/types";

export default function guard(pageContext: PageContext) {
  const { id } = pageContext.routeParams;

  if (!id || isNaN(Number(id))) {
    throw redirect(`$/maps/ingestion`);
  }

  const user = pageContext?.user;

  if (user == null) {
    // Redirect to the login page
    throw redirect(
      `${ingestPrefix}/security/login?return_url=${encodeURIComponent(
        pageContext.urlOriginal
      )}`
    );
  }
}
