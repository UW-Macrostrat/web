import { render, redirect } from "vike/abort";
import { ingestPrefix } from "@macrostrat-web/settings";
import type { PageContext } from "vike/types";

export async function guard(pageContext: PageContext) {
  const { user } = pageContext;

  if (user === undefined) {
    // Render the login page while preserving the URL. (This is novel technique
    // which we explain down below.)
    throw redirect(
      `${ingestPrefix}/security/login?return_url=${pageContext.urlOriginal}`
    );
    /* The more traditional way, redirect the user:
    throw redirect('/login')
    */
  }
  if (!user.groups.includes(1)) {
    // Render the error page and show message to the user
    return render(403, "Only admins are allowed to access this page.");
  }
}
