import { postgrestPrefix } from "@macrostrat-web/settings";
import { PageContextServer } from "vike/types";
import { PostgrestClient } from "@supabase/postgrest-js";

const client = new PostgrestClient(postgrestPrefix);

export async function onBeforeRender(pageContext: PageContextServer) {
  const { id } = pageContext.routeParams;
  const res: any = await client
    .from("sources")
    .select("source_id,slug,name")
    .eq("source_id", id);

  const map = res?.data?.[0];

  return {
    pageContext: {
      pageProps: {
        map,
      },
      documentProps: {
        // The page's <title>
        title: map.name + "– Legend",
      },
    },
  };
}
