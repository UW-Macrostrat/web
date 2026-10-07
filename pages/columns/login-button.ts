import h from "@macrostrat/hyper";
import { AnchorButton, Tooltip } from "@blueprintjs/core";
import { useAuth } from "@macrostrat/form-components";
import { useAtomValue } from "jotai";
import { layoutShellAtom } from "~/layouts/hybrid";

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
  // The map and split shells' headers are narrow panels; there it's an icon
  const compact = useAtomValue(layoutShellAtom) !== "content";

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
      minimal: minimal || compact,
      icon,
      intent,
      size: buttonSize(compact),
      text: compactLabel(label, compact),
      onClick() {
        runAction({ type: loggedIn ? "logout" : "login" });
      },
    })
  );
}

function buttonSize(compact: boolean) {
  if (compact) return "small";
  return "large";
}

function compactLabel(label: string, compact: boolean) {
  if (compact) return undefined;
  return label;
}
