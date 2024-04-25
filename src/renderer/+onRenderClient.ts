export { render as onRenderClient };

import { FocusStyleManager } from "@blueprintjs/core";
import h from "@macrostrat/hyper";
import ReactDOM from "react-dom/client";
import { PageShell } from "./page-shell";
import type { PageContextClient } from "./types";

let root: ReactDOM.Root;

// This render() hook only supports SSR, see https://vike.dev/render-modes for how to modify render() to support SPA
async function render(pageContext: PageContextClient) {
  const { Page, pageProps } = pageContext;
  if (!Page)
    throw new Error(
      "Client-side render() hook expects pageContext.Page to be defined"
    );

  console.log("Rendering on client side");

  FocusStyleManager.onlyShowFocusOnTabs();

  const page = h(PageShell, { pageContext }, h(Page, pageProps));

  const container = document.getElementById("app-container")!;

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
      //const title = getHeadSetting("title", pageContext) || "Macrostrat";
      //const lang = getHeadSetting("lang", pageContext) || "en";
      // const favicon = getHeadSetting('favicon', pageContext)
      // // We skip if the value is undefined because we shouldn't remove values set in HTML (by the Head setting).
      // //  - This also means that previous values will leak: upon client-side navigation, the title set by the previous page won't be removed if the next page doesn't override it. But that's okay because usually pages always have a favicon and title, which means that previous values are always overriden. Also, as a workaround, the user can set the value to `null` to ensure that previous values are overriden.
      //if (title !== undefined) document.title = title;
      //if (lang !== undefined) document.documentElement.lang = lang;
      //if (favicon !== undefined) setFavicon(favicon)
    }

    root.render(page);
  }
}

/* To enable Client-side Routing:
export const clientRouting = true
// !! WARNING !! Before doing so, read https://vike.dev/clientRouting */

// function getHeadSetting(key: string, pageContext: PageContextClient) {
//   return (
//     pageContext.documentProps?.[key] ??
//     pageContext.exports?.documentProps?.[key]
//   );
// }
