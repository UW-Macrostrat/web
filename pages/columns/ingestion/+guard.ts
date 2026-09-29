import { render } from "vike/abort";

// Admin-only, matching the api-v3 `/columns/ingest` endpoint (which requires
// web_admin) and the former column-editor guard this page was moved out of.
// Scoped to `/columns/ingestion` only — the rest of `/columns` stays public.
export async function guard(pageContext) {
  if (pageContext.user?.role != "web_admin") {
    throw render(401, "You aren't allowed to access this page.");
  }
}
