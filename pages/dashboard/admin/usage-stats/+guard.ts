import { requireAdmin } from "~/_utils/auth-guards";

// Hides the page; api_v3's `/usage-stats` routes refuse non-admin sessions.
export async function guard(pageContext) {
  requireAdmin(pageContext);
}
