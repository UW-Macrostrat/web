// For full vike-react integration, we need to remove +onRenderClient.ts and +onRenderHTML.ts
import vikeReact from "vike-react/config";
import type { Config } from "vike/types";

const Layout = "import:../renderer/Layout.ts:default";
const Head = "import:../renderer/Head.ts:default";

// import Head from "../renderer/Head.js";

// Default config (can be overridden by pages)
export default {
  Layout,
  Head,
  // <title>
  title: "Macrostrat",
  description:
    "A platform for geological data exploration, integration, and analysis.",
  extends: vikeReact,
  passToClient: [
    "pageProps",
    "pageStyle",
    "supportsDarkMode",
    "macrostratLogoFlavor",
    "routeParams",
    "user",
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
