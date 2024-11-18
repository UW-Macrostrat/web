import { render } from "vike/abort";

// This guard() hook protects all pages /pages/admin/**/+Page.js
// https://vike.dev/guard

export async function guard(pageContext) {
  if (pageContext.user?.role != "web_admin") {
    throw render(401, "You aren't allowed to access this page.");
  }
}
