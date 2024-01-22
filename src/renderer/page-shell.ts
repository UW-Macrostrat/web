import h from "@macrostrat/hyper";
import { DarkModeProvider } from "@macrostrat/ui-components";
import React from "react";
import { PageContextProvider } from "./page-context";
import { PageContext } from "./types";

import "~/styles/blueprint-core";
import "~/styles/core.sass";
import "~/styles/padding.css";

export function PageShell({
  children,
  pageContext,
}: {
  children: React.ReactNode;
  pageContext: PageContext;
}) {
  return h("div.app-shell", [
    h(
      PageContextProvider,
      { pageContext },
      h(DarkModeProvider, { followSystem: true }, children)
    ),
  ]);
}
