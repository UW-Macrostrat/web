import { requireAdmin } from "~/_utils/auth-guards";

// Adding a source map is an edit of record: administrators only.
export default function guard(pageContext) {
  requireAdmin(pageContext);
}
