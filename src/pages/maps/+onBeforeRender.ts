import { apiV2Prefix } from "@macrostrat-web/settings";
import { PostgrestClient } from "@supabase/postgrest-js";
import { postgrestPrefix } from "@macrostrat-web/settings";

const apiAddress = apiV2Prefix + "/defs/sources";

const postgrest = new PostgrestClient(postgrestPrefix);

export async function onBeforeRender(pageContext) {
  // `.page.server.js` files always run in Node.js; we could use SQL/ORM queries here.

  const res = await postgrest
    .from("sources_metadata")
    .select("*")
    .order("source_id", { ascending: true });

  const data = res.data;

  const pageProps = { sources: data };
  return {
    pageContext: {
      pageProps,
    },
  };
}
