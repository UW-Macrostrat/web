import { requireDevInstance } from "~/_utils/auth-guards";

// Integration pages are likely to be removed; development instances only.
// `xdd/legacy` keeps its own guard, which redirects old links to /ext/kg.
export async function guard() {
  requireDevInstance();
}
