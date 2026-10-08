import { requireLogin } from "~/_utils/auth-guards";

// `/columns/new` starts a column in the experimental editor — viewable only by
// signed-in users; anonymous visitors are sent to sign in and brought back.
// Mirrors the `@column/edit` guard; this route was missing one, so web_anon
// could reach it.
export async function guard(pageContext) {
  requireLogin(pageContext);
}
