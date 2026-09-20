import type { Config } from "vike/types";

/** Pages whose prose comes from the documentation vault's `Site/` folder,
 * rendered as shells with component slots (see `~/site-pages`). Each route
 * directory below holds a one-line `+Page.ts`; this config and the
 * `+onBeforeRender` hook beside it apply to all of them. */
export default {
  passToClient: [
    "pageProps",
    "pageStyle",
    "pageInfo",
    "supportsDarkMode",
    "routeParams",
    "user",
    "siteRoute",
    "siteTitle",
    "siteSections",
    "siteData",
    "siteCrumbs",
  ],
  // Inline breadcrumbs (the trail and the title on one line), the shared
  // content width, and the footer.
  pageStyle: "index",
  pageInfo: "import:./pageInfo:pageInfo",
} satisfies Config;
