import { redirect } from "vike/abort";
import { legacySiftTarget } from "./legacy-routes";

/** `/sift/<type>/<id>` redirects on the server. Bare `/sift` renders, so its
 * head script can read the `#/…` fragment the server never sees. */
export async function guard(pageContext) {
  const path = pageContext.urlPathname.replace(/^\/sift\/?/, "");
  if (path === "") return;
  throw redirect(await legacySiftTarget(path), 301);
}
