import { Config, ConfigDefinition } from "vike/types";

export default {
  passToClient: [
    "pageProps",
    "pageStyle",
    "supportsDarkMode",
    "routeParams",
    "user",
    "mdxContent",
    "title",
  ],
  route: "/dev/docs*",
} satisfies Config;
