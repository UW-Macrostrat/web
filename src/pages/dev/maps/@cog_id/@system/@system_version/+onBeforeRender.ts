import { postgrestPrefix } from "@macrostrat-web/settings";
import { PageContextServer } from "vike/types";
import { PostgrestClient } from "@supabase/postgrest-js";

const client = new PostgrestClient(postgrestPrefix, {
  headers: { Accept: "application/geo+json" },
});

export async function onBeforeRender(pageContext: PageContextServer) {

  const { cog_id, system, system_version } = pageContext.routeParams;

  const url = `http://localhost:8333/v1/tiles/cog/${cog_id}/system/${system}/system_version/${system_version}`
  const res = await fetch(url)
  const data = await res.json()

  return {
    pageContext: {
      pageProps: {
        cog_id,
        system,
        system_version,
        envelope: data.web_geom
      }
    },
  };
}
