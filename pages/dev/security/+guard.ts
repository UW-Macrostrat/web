import { requireAdmin } from "~/_utils/auth-guards";

// A test page for the sign-in flow: anonymous visitors are sent to sign in and
// return here; signed-in non-admins get a 403.
export async function guard(pageContext) {
  requireAdmin(pageContext);
}
