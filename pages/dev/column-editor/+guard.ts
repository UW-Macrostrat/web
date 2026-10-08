import { requireAdmin } from "~/_utils/auth-guards";

// This guard() hook protects all pages under /dev/column-editor/**
// https://vike.dev/guard
export async function guard(pageContext) {
  requireAdmin(pageContext);
}
