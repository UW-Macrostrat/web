import { requireAuthorized } from "~/_utils/auth-guards";

// Column editing is work in progress: authorized users and administrators.
export async function guard(pageContext) {
  requireAuthorized(pageContext);
}
