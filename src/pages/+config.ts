// For full vike-react integration, we need to remove +onRenderClient.ts and +onRenderHTML.ts
import vikeReact from "vike-react/config";
import type { Config } from "vike/types";

const Layout = "import:../renderer/page-shell.ts:PageShell";
const Head = "import:../renderer/head.ts:Head";

// Default config (can be overridden by pages)
export default {
  Layout,
  Head,
  // <title>
  title: "Macrostrat",
  extends: vikeReact,
  passToClient: [
    "pageProps",
    "pageStyle",
    "supportsDarkMode",
    "macrostratLogoFlavor",
    "routeParams",
    "user",
    "urlPathname",
    "description",
    "title",
    "environment",
  ],
  clientRouting: true,
  meta: {
    supportsDarkMode: {
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
