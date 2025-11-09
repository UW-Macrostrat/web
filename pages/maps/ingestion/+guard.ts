import { redirect, render } from "vike/abort";
import { isLocalTesting } from "~/_providers/localTestingAuth";

export default function guard(pageContext: any) {
  if (isLocalTesting()) return;

  const path = pageContext?.urlPathname;
  const user = pageContext?.user ?? null;
  const roles: string[] = Array.isArray(user?.roles)
    ? user.roles
    : user?.role
    ? [user.role]
    : [];
  const effectiveRoles = roles.length ? roles : ["web_anon"];
  const groupNames: string[] = Array.isArray(user?.groups)
    ? user.groups
        .map((g: any) => (typeof g === "string" ? g : g?.name))
        .filter(Boolean)
    : [];

  const allowed =
    effectiveRoles.includes("web_anon") ||
    effectiveRoles.includes("admin") ||
    effectiveRoles.includes("web_admin") ||
    groupNames.includes("web_admin");

  if (!allowed) {
    throw render(403, "Only admins are allowed to access this page.");
  }
}
