import h from "./main.module.sass";
import { usePageContext } from "vike-react/usePageContext";
import {
  Button,
  NonIdealState,
  ButtonGroup,
  AnchorButton,
} from "@blueprintjs/core";
import { ReactNode } from "react";
import { LoginPrompt, UserPersona } from "~/components/auth";

const authActions = [
  h(UserPersona, { minimal: false, large: true }),
  h(AnchorButton, { icon: "home", href: "/" }, "Go home"),
];

export function Page() {
  const ctx = usePageContext();
  let title = "Internal error";
  let description = ctx.abortReason;
  let actions: ReactNode[] = [
    h(
      Button,
      {
        icon: "arrow-left",
        onClick() {
          window.history.back();
        },
      },
      "Go back"
    ),
    h(AnchorButton, { icon: "home", href: "/" }, "Go home"),
  ];

  if (ctx.abortStatusCode == 401) {
    // Not signed in: the standard sign-in prompt, returning to this page.
    return h(LoginPrompt, {
      returnURL: ctx.urlPathname,
      title: "Sign in to view this page",
      description: ctx.abortReason,
      actions: h(
        AnchorButton,
        { large: true, minimal: true, icon: "home", href: "/" },
        "Go home"
      ),
    });
  }

  if (ctx.abortStatusCode == 403) {
    title = "Forbidden";
    description ??= "You do not have permission to view this page.";
    actions = authActions;
  }

  if (ctx.is404) {
    title = "Page Not Found";
    description ??= "The page you are looking for does not exist.";
  }

  description ??= "An error occurred while retrieving the page.";

  return h(NonIdealState, {
    title,
    icon: "warning-sign",
    description,
    action: h(ButtonGroup, { minimal: true, large: true }, actions),
  });
}
