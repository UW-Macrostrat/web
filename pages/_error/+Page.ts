import h from "./main.module.sass";
import { usePageContext } from "vike-react/usePageContext";
import {
  Button,
  NonIdealState,
  ButtonGroup,
  AnchorButton,
} from "@blueprintjs/core";
import { ReactNode } from "react";
import { AuthStatus } from "@macrostrat/form-components";

const authActions = [
  h(AuthStatus),
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
    title = "Unauthorized";
    description ??= "You are not authorized to view this page.";
    actions = authActions;
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
