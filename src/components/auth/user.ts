/**
 * The signed-in user, as the app sees it.
 *
 * Two shapes flow through `useAuth()`: on a server render, the JWT claims the
 * web server verified from the cookie (`sub`, `role`, `name`, and `actual_role`
 * on a degraded session); after a client-side `get-status`, the record
 * `GET /security/me` returns, which carries the same role fields with the same
 * meaning plus the stored profile (`email`, `display_name`, `app_role`…). These
 * helpers read either, so a component never has to know which one it got.
 *
 * `role` is always the *Postgres* role the session carries (`web_user`,
 * `web_admin`) — what PostgREST assumes and the page guards compare against.
 */

export const ADMIN_ROLE = "web_admin";
export const AUTHORIZED_ROLE = "web_authorized";
export const USER_ROLE = "web_user";
export const ANONYMOUS_ROLE = "web_anon";

/** The tiers nest: each inherits the one below it. Anyone can become a
 * `web_user` by signing in, so that tier confers nothing substantial; an
 * administrator designates `web_authorized` users, who may view anything but
 * edit nothing of record; only `web_admin` makes real edits. */
const ROLE_RANK: Record<string, number> = {
  [ANONYMOUS_ROLE]: 0,
  [USER_ROLE]: 1,
  [AUTHORIZED_ROLE]: 2,
  [ADMIN_ROLE]: 3,
};

export function roleRank(role: string | null | undefined): number {
  return ROLE_RANK[role ?? ANONYMOUS_ROLE] ?? 0;
}

/** Whether `role` carries at least the standing of `required`. */
export function roleAtLeast(
  role: string | null | undefined,
  required: string
): boolean {
  return roleRank(role) >= roleRank(required);
}

/** The roles a session in `role` may be degraded to, highest first. */
export function assumableRoles(role: string | null | undefined): string[] {
  return [ADMIN_ROLE, AUTHORIZED_ROLE, USER_ROLE].filter(
    (r) => roleRank(r) < roleRank(role)
  );
}

export interface SessionUser {
  sub: string;
  role?: string;
  /** Present when the session carries a lesser role than the account holds. */
  actual_role?: string;
  /** The JWT's `name` claim (display name). */
  name?: string;
  // From `GET /security/me` only
  id?: number;
  display_name?: string;
  email?: string;
  app_role?: string;
  degraded?: boolean;
  created_on?: string;
  updated_on?: string;
  /** The JWT's expiry, in seconds since the epoch. */
  exp?: number;
}

/** The role this session acts with. Anonymous when there is no user. */
export function sessionRole(user: SessionUser | null | undefined): string {
  return user?.role ?? ANONYMOUS_ROLE;
}

/** The role the account is entitled to, degraded or not. */
export function accountRole(user: SessionUser | null | undefined): string {
  if (user == null) return ANONYMOUS_ROLE;
  return user.actual_role ?? user.role ?? USER_ROLE;
}

/** True when an admin has chosen to browse with a lesser role. */
export function isDegraded(user: SessionUser | null | undefined): boolean {
  if (user == null) return false;
  if (user.degraded != null) return user.degraded;
  return user.actual_role != null && user.actual_role !== user.role;
}

/** Whether the account is an administrator (whatever role the session carries). */
export function isAdminAccount(user: SessionUser | null | undefined): boolean {
  return accountRole(user) === ADMIN_ROLE;
}

/** Whether the session itself acts as an administrator right now. */
export function isAdminSession(user: SessionUser | null | undefined): boolean {
  return sessionRole(user) === ADMIN_ROLE;
}

/** Whether the session may view everything: an authorized user or an admin. */
export function isAuthorizedSession(
  user: SessionUser | null | undefined
): boolean {
  return roleAtLeast(sessionRole(user), AUTHORIZED_ROLE);
}

export function displayName(user: SessionUser | null | undefined): string {
  const name = user?.display_name ?? user?.name;
  if (typeof name === "string" && name.trim() !== "") return name.trim();
  return "Signed in";
}

/** The public ORCID record for a user; `sub` is their ORCID iD. */
export function orcidURL(sub: string | null | undefined): string | null {
  if (sub == null || sub === "") return null;
  if (sub.startsWith("http")) return sub;
  return `https://orcid.org/${sub}`;
}

export function roleLabel(role: string | null | undefined): string {
  switch (role) {
    case ADMIN_ROLE:
      return "Administrator";
    case AUTHORIZED_ROLE:
      return "Authorized user";
    case USER_ROLE:
      return "User";
    case ANONYMOUS_ROLE:
      return "Anonymous";
    default:
      return role ?? "Unknown";
  }
}
