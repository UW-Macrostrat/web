import h from "@macrostrat/hyper";
import { AnchorButton, Tooltip } from "@blueprintjs/core";
import { useAuth } from "@macrostrat/form-components";

/**
 * Login / logout toggle for the `/columns` page.
 *
 * Mirrors the maps-ingestion login button, but reflects auth state: "Log In"
 * when signed out (redirects to ORCID via the app-wide `AuthProvider`), "Log
 * Out" when signed in (clears the session). It changes no access rules — only
 * `/columns/ingestion` is gated; this just lets a visitor sign in so the
 * already-guarded pages become reachable.
 */
export function LoginButton({ minimal = false }: { minimal?: boolean }) {
  const { user, runAction } = useAuth();
  const loggedIn = user != null;

  let label = "Log In";
  let icon: "blocked-person" | "user" = "blocked-person";
  let intent: "primary" | "success" = "primary";
  if (loggedIn) {
    label = "Log Out";
    icon = "user";
    intent = "success";
  }

  return h(
    Tooltip,
    { content: loggedIn ? "Log out" : "Log in with ORCID" },
    h(AnchorButton, {
      minimal,
      icon,
      intent,
      large: true,
      text: label,
      onClick() {
        runAction({ type: loggedIn ? "logout" : "login" });
      },
    })
  );
}
