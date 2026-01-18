import { postgrestPrefix } from "@macrostrat-web/settings";
import type { PageContextServer } from "vike/types";
import type { PostgrestClient } from "@supabase/postgrest-js";

const client = new PostgrestClient(postgrestPrefix, {
  headers: { Accept: "application/geo+json" },
});

export async function onBeforeRender(pageContext: PageContextServer) {
  const { id } = pageContext.routeParams;
  const res: any = await client.from("sources").select("*").eq("source_id", id);
  const map = res?.data?.features[0];

  console.log(map.geometry.coordinates);

  return {
    pageContext: {
      pageProps: {
        map,
      },
      documentProps: {
        // The page's <title>
        title: map.properties.name,
      },
    },
  };
}
