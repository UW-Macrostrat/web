import { postgrestPrefix } from "@macrostrat-web/settings";
import { PageContextServer } from "vike/types";
import { PostgrestClient } from "@supabase/postgrest-js";

const client = new PostgrestClient(postgrestPrefix, {
  headers: { Accept: "application/geo+json" },
});

export async function onBeforeRender(pageContext: PageContextServer) {
  const { id } = pageContext.routeParams;
  const res: any = await client.from("sources").select("*").eq("source_id", id);
  const map = res?.data?.features[0];

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
