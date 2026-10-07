/**
 * The standard sign-in flow for a guarded page, for use in a `+guard.ts`.
 *
 * An anonymous visitor is sent to `/login`, which explains that the page needs
 * an account and brings them back to the URL they asked for once they have
 * signed in. A signed-in visitor who lacks the role gets a 403, rendered by
 * the error page with the persona control so they can see which account they
 * are using. The local-testing escape hatch (`LOCAL_TESTING_AUTH`) stands in a
 * mock admin and skips both checks, as the older per-page guards did.
 *
 * Kept free of UI imports: a guard runs on the server and in the client
 * router, and should stay cheap to load.
 */
import { redirect, render } from "vike/abort";
import { isLocalTesting } from "~/_providers/localTestingAuth";

const ADMIN_ROLE = "web_admin";
const AUTHORIZED_ROLE = "web_authorized";
// The tiers nest; see `~/components/auth/user.ts` for the full account.
const ROLE_RANK: Record<string, number> = {
  web_user: 1,
  [AUTHORIZED_ROLE]: 2,
  [ADMIN_ROLE]: 3,
};

/** The `/login` page, returning to the page `pageContext` describes. */
export function loginPageURL(pageContext: any): string {
  // A path, not `urlOriginal` (which is absolute): the login page honors only
  // a same-origin path, so it can't be made to bounce a visitor elsewhere.
  const parsed = pageContext?.urlParsed;
  let returnURL = parsed?.pathname ?? pageContext?.urlPathname ?? "/";
  if (parsed?.searchOriginal) returnURL += parsed.searchOriginal;
  return `/login?return_url=${encodeURIComponent(returnURL)}`;
}

/** Require a signed-in user; anonymous visitors go to the login page. */
export function requireLogin(pageContext: any) {
  if (isLocalTesting()) return;
  if (pageContext?.user == null) {
    throw redirect(loginPageURL(pageContext));
  }
}

/**
 * Require a session of at least `role`. With `allowDegraded`, an account that
 * holds the role but is browsing with a reduced one (see `useAssumeRole`) is
 * let through too.
 */
function requireRole(
  pageContext: any,
  role: string,
  message: string,
  allowDegraded: boolean
) {
  requireLogin(pageContext);
  if (isLocalTesting()) return;
  const user = pageContext.user;
  const rank = (r: string | undefined) => ROLE_RANK[r ?? ""] ?? 0;
  let allowed = rank(user?.role) >= rank(role);
  if (allowDegraded && rank(user?.actual_role) >= rank(role)) allowed = true;
  if (!allowed) throw render(403, message);
}

/**
 * Require an authorized user or an administrator: the "view anything" tier.
 * A plain signed-in user is anyone with an ORCID iD, so pages showing work in
 * progress sit behind this rather than behind `requireLogin`.
 */
export function requireAuthorized(pageContext: any) {
  requireRole(
    pageContext,
    AUTHORIZED_ROLE,
    "Only authorized users and administrators can access this page. " +
      "Ask a Macrostrat administrator to authorize your account.",
    false
  );
}

/**
 * Require an administrator. With `allowDegraded`, an admin who is browsing
 * with a reduced role is let through too — the admin page itself needs that,
 * since it is where the role is restored.
 */
export function requireAdmin(
  pageContext: any,
  { allowDegraded = false }: { allowDegraded?: boolean } = {}
) {
  requireRole(
    pageContext,
    ADMIN_ROLE,
    "Only administrators can access this page.",
    allowDegraded
  );
}
