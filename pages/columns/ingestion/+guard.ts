import { render } from "vike/abort";

// Any signed-in user may reach this page: web_users can run dry-run validations,
// web_admins can also persist. The api-v3 `/columns/ingest` endpoint enforces
// that split server-side (it forces dry_run for non-admins). Anonymous callers
// are rejected. Scoped to `/columns/ingestion` only — the rest of `/columns`
// stays public.
export async function guard(pageContext) {
  const role = pageContext.user?.role;
  if (role !== "web_admin" && role !== "web_user") {
    throw render(401, "You must be signed in to access this page.");
  }
}
