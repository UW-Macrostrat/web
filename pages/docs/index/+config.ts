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
  ],
  route: "/docs*",
  pageInfo: {
    name: "Documentation",
  },
} satisfies Config;
