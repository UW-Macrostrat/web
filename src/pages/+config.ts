import vikeReact from "vike-react/config";
import type { Config } from "vike/types";
//const Layout = "import:~/layouts:BasePage";
//import Head from "../layouts/HeadDefault.js";

// Default config (can be overridden by pages)
export default {
  //Layout,
  //Head,
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
  },
} satisfies Config;
