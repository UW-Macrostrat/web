export { render as onRenderClient };

import { FocusStyleManager } from "@blueprintjs/core";
import h from "@macrostrat/hyper";
import ReactDOM from "react-dom/client";
import { PageShell } from "../renderer/page-shell";
import type { PageContextClient } from "../renderer/types";
import { buildPageMeta } from "~/_utils/page-meta";
import vikeReact from "vike-react";

let root: ReactDOM.Root;

async function render(pageContext: PageContextClient) {
  const { Page, pageProps } = pageContext;
  if (!Page)
    throw new Error(
      "Client-side render() hook expects pageContext.Page to be defined"
    );

  FocusStyleManager.onlyShowFocusOnTabs();

  const page = h(PageShell, { pageContext }, h(Page, pageProps));

  const container = document.getElementById("app-container")!;

  const { title, description } = buildPageMeta(pageContext);

  // TODO: we might be able to switch to vike-react's internal renderer
  if (container.innerHTML !== "" && pageContext.isHydration) {
    // First render (hydration)
    root = ReactDOM.hydrateRoot(container, page);
  } else {
    if (!root) {
      // First render (not hydration)
      root = ReactDOM.createRoot(container);
    } else {
      // Client-side navigation
      document.title = title;
      document
        .querySelector('meta[name="description"]')!
        .setAttribute("content", description);
    }

    root.render(page);
  }
}
