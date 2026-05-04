import { redirect } from "vike/abort";
import { ingestPrefix } from "@macrostrat-web/settings";
import type { PageContext } from "vike/types";
import { isLocalTesting } from "~/_providers/localTestingAuth";

export default function guard(pageContext: PageContext) {
  if (isLocalTesting()) return;

  const user = pageContext?.user;

  if (user == null) {
    throw redirect(
      `${ingestPrefix}/security/login?return_url=${encodeURIComponent(
        pageContext.urlOriginal
      )}`
    );
  }
}
