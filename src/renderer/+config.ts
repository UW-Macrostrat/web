import { Config, ConfigDefinition } from "vike/types";

export default {
  passToClient: [
    "pageProps",
    "pageStyle",
    "supportsDarkMode",
    "isolateStyles",
    "macrostratLogoFlavor",
    "routeParams",
    "user",
    "urlPathname",
  ],
  clientRouting: true,
  hydrationCanBeAborted: true,
  meta: {
    supportsDarkMode: {
      env: {
        client: true,
        server: true,
      },
    },
    isolateStyles: {
      env: {
        client: true,
        server: true,
      },
    },
    documentProps: {
      env: {
        client: true,
        server: true,
      },
    },
  },
} satisfies Config;
