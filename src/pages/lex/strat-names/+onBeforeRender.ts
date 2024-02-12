import { postgrestPrefix } from "@macrostrat-web/settings";
import fetch from "node-fetch";
import { fetchStratNames } from "./data-service";

const apiAddress =
  postgrestPrefix + "/strat_names_units_kg?kg_liths=not.is.null";

export async function onBeforeRender(pageContext) {
  const data = await fetchStratNames();

  const pageProps = { data };
  return {
    pageContext: {
      pageProps,
    },
  };
}
