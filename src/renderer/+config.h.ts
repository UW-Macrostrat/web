import { Config } from "vike/types";

export default {
  passToClient: ["pageProps", "urlPathname", "pageStyle"],
  clientRouting: true,
  hydrationCanBeAborted: true,
} satisfies Config;
