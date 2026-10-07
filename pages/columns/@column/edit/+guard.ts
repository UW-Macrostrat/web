import { requireLogin } from "~/_utils/auth-guards";

// The experimental column editor (picker index, "new", and edit pages) is
// viewable only by signed-in users (web_user or web_admin); anonymous visitors
// are sent to sign in and brought back. The editor has no write API yet (edits
// live in the page), but viewing it still requires sign-in.
export async function guard(pageContext) {
  requireLogin(pageContext);
}
