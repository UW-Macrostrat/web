import React from "react";
import { PageContextProvider } from "./usePageContext";
import { PageContext } from "./types";
import h from "@macrostrat/hyper";

export { PageShell };

function PageShell({
  children,
  pageContext,
}: {
  children: React.ReactNode;
  pageContext: PageContext;
}) {
  return h("div.app", [h(PageContextProvider, { pageContext }, children)]);
}
