// For full vike-react integration, we need to remove +onRenderClient.ts and +onRenderHTML.ts
import vikeReact from "vike-react/config";
import type { Config } from "vike/types";

// Default config (can be overridden by pages)
export default {
  title: "Macrostrat",
  pageStyle: "content",
  description:
    "A platform for geological data exploration, integration, and analysis.",
  extends: vikeReact,
  // Setting these values forces a pageContext.json request to be generated with each page request.
  // https://vike.dev/pageContext.json#avoid-pagecontext-json-requests
  passToClient: [
    "pageProps",
    "supportsDarkMode",
    "macrostratLogoFlavor",
    "routeParams",
    "user",
    "description",
    "title",
    "environment",
    "urlPathname",
    "scripts",
    "pageStyle",
  ],
  clientRouting: true,
  supportsDarkMode: true,
  trailingSlash: false,
  meta: {
    supportsDarkMode: {
      env: {
        client: true,
        server: true,
      },
    },
    pageStyle: {
      env: {
        client: true,
        server: true,
      },
    },
    scripts: {
      env: {
        client: false,
        server: true,
      },
    },
    description: {
      env: {
        client: true,
        server: true,
      },
    },
    environment: {
      env: {
        client: true,
        server: true,
      },
    },
  },
} satisfies Config;
