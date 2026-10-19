import { requireAuthorized } from "~/_utils/auth-guards";

// Column creation is work in progress: authorized users and administrators.
export async function guard(pageContext) {
  requireAuthorized(pageContext);
}
