import { requireAdmin } from "~/_utils/auth-guards";

// Administrators only. An admin browsing with a reduced role is let in too:
// this page is where that role is restored, and the tools on it fail closed
// (the API refuses a non-admin session) rather than relying on the guard.
export async function guard(pageContext) {
  requireAdmin(pageContext, { allowDegraded: true });
}
