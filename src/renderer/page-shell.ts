import React from "react";
import { PageContextProvider } from "./page-context";
import { PageContext } from "./types";
import h from "@macrostrat/hyper";
import { DarkModeProvider } from "@macrostrat/ui-components";

import "@blueprintjs/core/lib/css/blueprint.css";
import "../styles/padding.css";
import "../styles/core.sass";

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
