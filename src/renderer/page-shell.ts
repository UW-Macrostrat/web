import h from "@macrostrat/hyper";
import { DarkModeProvider } from "@macrostrat/ui-components";
import React from "react";
import { PageContextProvider } from "./page-context";
import { PageContext } from "./types";

import "@blueprintjs/core/lib/css/blueprint.css";
import "../styles/_theme.styl";
import "../styles/core.sass";
import "../styles/padding.css";

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
