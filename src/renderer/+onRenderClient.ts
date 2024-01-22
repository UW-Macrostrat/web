export { render as onRenderClient };

import { FocusStyleManager } from "@blueprintjs/core";
import h from "@macrostrat/hyper";
import { hydrateRoot } from "react-dom/client";
import { PageShell } from "./page-shell";
import type { PageContextClient } from "./types";

// This render() hook only supports SSR, see https://vike.dev/render-modes for how to modify render() to support SPA
async function render(pageContext: PageContextClient) {
  const { Page, pageProps } = pageContext;
  if (!Page)
    throw new Error(
      "Client-side render() hook expects pageContext.Page to be defined"
    );

  FocusStyleManager.onlyShowFocusOnTabs();

  console.log("Rendering on client");
  const root = document.getElementById("app-container");
  if (!root) throw new Error("DOM element #react-root not found");
  hydrateRoot(root, h(PageShell, { pageContext }, h(Page, pageProps)));
}

/* To enable Client-side Routing:
export const clientRouting = true
// !! WARNING !! Before doing so, read https://vike.dev/clientRouting */
