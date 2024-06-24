import { postgrestPrefix } from "@macrostrat-web/settings";
import { PageContextServer } from "vike/types";
import { PostgrestClient } from "@supabase/postgrest-js";

const client = new PostgrestClient(postgrestPrefix, {
  headers: { Accept: "application/geo+json" },
});

export async function onBeforeRender(pageContext: PageContextServer) {

  const { cog_id, model_id } = pageContext.routeParams;

  const url = `http://localhost:8333/v1/tiles/cog/${cog_id}/model/${model_id}`
  const res = await fetch(url)
  const data = await res.json()

  console.log(data)

  return {
    pageContext: {
      pageProps: {
        cog_id,
        model_id,
        envelope: data.web_geom
      }
    },
  };
}
