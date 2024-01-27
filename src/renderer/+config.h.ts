import { Config } from "vike/types";

export default {
  passToClient: ["pageProps", "urlPathname", "pageStyle", "supportsDarkMode"],
  clientRouting: true,
  hydrationCanBeAborted: true,
} satisfies Config;
