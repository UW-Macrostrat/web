import { render } from "vike/abort";

// Editing a boundary is an admin operation. This hides the page; the
// authorization that matters is on api-v3 `/bounds`, gated by `require_admin`.
export async function guard(pageContext) {
  if (pageContext.user?.role != "web_admin") {
    throw render(401, "You aren't allowed to access this page.");
  }
}
