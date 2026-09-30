import { render } from "vike/abort";

// The experimental column editor (picker index, "new", and edit pages) is
// viewable only by signed-in users (web_user or web_admin); anonymous visitors
// are rejected. Scoped to the whole /dev/column-editor-2 subtree. Mirrors the
// /columns/ingestion guard. The editor has no write API yet (edits live in the
// page), but viewing it still requires sign-in.
export async function guard(pageContext) {
  const role = pageContext.user?.role;
  if (role !== "web_admin" && role !== "web_user") {
    throw render(401, "You must be signed in to use the column editor.");
  }
}
