import hyper from "@macrostrat/hyper";
import { Button, NonIdealState } from "@blueprintjs/core";
import { useAuth } from "@macrostrat/form-components";
import type { ReactNode } from "react";
import styles from "./auth.module.sass";

const h = hyper.styled(styles);

export interface LoginPromptProps {
  /** Where to come back to after signing in (a path). Default: this page. */
  returnURL?: string;
  title?: ReactNode;
  /** Why signing in is being asked for. */
  description?: ReactNode;
  /** Extra actions beside the sign-in button (e.g. "Go home"). */
  actions?: ReactNode;
}

/**
 * The standard "sign in to continue" surface, used wherever a visitor arrives
 * without the session a page needs: the `/login` page, the dashboard when
 * signed out, and the error page for a 401. Signing in goes through the
 * app-wide `AuthProvider`'s `login` action (ORCID, via the API).
 */
export function LoginPrompt({
  returnURL,
  title = "Sign in to continue",
  description,
  actions,
}: LoginPromptProps) {
  let detail: ReactNode = description;
  if (detail == null) {
    detail = h("p", [
      "Macrostrat uses your ",
      h("a", { href: "https://orcid.org", target: "_blank" }, "ORCID iD"),
      " to sign you in. You'll be brought back here afterwards.",
    ]);
  }

  return h(NonIdealState, {
    className: "login-prompt",
    icon: "log-in",
    title,
    description: h("div.login-prompt-description", detail),
    action: h("div.login-prompt-actions", [
      h(SignInButton, { returnURL }),
      actions,
    ]),
  });
}

export function SignInButton({
  returnURL,
  large = true,
  minimal = false,
  text = "Sign in with ORCID",
}: {
  returnURL?: string;
  large?: boolean;
  minimal?: boolean;
  text?: string;
}) {
  const { runAction } = useAuth();
  return h(Button, {
    intent: "primary",
    icon: "log-in",
    large,
    minimal,
    text,
    onClick() {
      runAction({ type: "login", returnURL } as any);
    },
  });
}
