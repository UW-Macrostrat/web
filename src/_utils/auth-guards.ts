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
 * Require an administrator. With `allowDegraded`, an admin who is browsing
 * with a reduced role (see `useAssumeRole`) is let through too — the admin
 * page itself needs that, since it is where the role is restored.
 */
export function requireAdmin(
  pageContext: any,
  { allowDegraded = false }: { allowDegraded?: boolean } = {}
) {
  requireLogin(pageContext);
  if (isLocalTesting()) return;
  const user = pageContext.user;
  let allowed = user?.role === ADMIN_ROLE;
  if (allowDegraded && user?.actual_role === ADMIN_ROLE) allowed = true;
  if (!allowed) {
    throw render(403, "Only administrators can access this page.");
  }
}
