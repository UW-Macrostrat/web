import { render } from "vike/abort";

// Flushing a cache is cheap to ask for and expensive to serve, so it is an
// admin operation. This hides the page; the authorization that actually matters
// is on the endpoint it calls (api_v3 `/cache/*`, gated by `require_admin`).
export async function guard(pageContext) {
  if (pageContext.user?.role != "web_admin") {
    throw render(401, "You aren't allowed to access this page.");
  }
}
