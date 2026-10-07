import { requireAuthorized } from "~/_utils/auth-guards";

// The ingestion queue shows maps that are works in progress, so viewing it
// takes the "view anything" tier (authorized users and administrators);
// anyone can sign in as a plain user, so sign-in alone is not enough. Edits
// are an administrator's job and are gated again by the API. Vike runs only
// the nearest guard, so the subtrees below declare their own.
export default function guard(pageContext) {
  requireAuthorized(pageContext);
}
