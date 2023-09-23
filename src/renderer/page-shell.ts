import React from "react";
import { PageContextProvider } from "./page-context";
import { PageContext } from "./types";
import h from "@macrostrat/hyper";

import "@blueprintjs/core/lib/css/blueprint.css";
import "../styles/padding.css";

export function PageShell({
  children,
  pageContext,
}: {
  children: React.ReactNode;
  pageContext: PageContext;
}) {
  return h("div.app-shell", [
    h(PageContextProvider, { pageContext }, children),
  ]);
}
