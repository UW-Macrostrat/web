import type { Config, ConfigDefinition } from "vike/types";

export default {
  passToClient: [
    "pageProps",
    "pageStyle",
    "pageInfo",
    "supportsDarkMode",
    "routeParams",
    "user",
    "mdxContent",
    "title",
    "docsNav",
    "docsCrumbs",
    "docsToc",
    "sectionIndex",
  ],
  route: "/docs*",
  // Bare wrapper: the page supplies its own frame (sticky breadcrumb header,
  // article, subsidiary sidebar) on top of the shared content-page shell.
  pageStyle: "docs",
  pageInfo: "import:./pageInfo:pageInfo",
} satisfies Config;
