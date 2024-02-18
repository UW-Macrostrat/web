import { ingestPrefix, postgrestPrefix } from "@macrostrat-web/settings";
import fetch from "node-fetch";
import { PostgrestClient } from "@supabase/postgrest-js";

const postgrest = new PostgrestClient(postgrestPrefix);

export async function onBeforeRender(pageContext) {
  const res = await postgrest
    .from("sources_ingestion")
    .select("*")
    .order("source_id", { ascending: false });

  const pageProps = {
    sources: res.data,
    user: pageContext.user,
    ingest_api: ingestPrefix,
  };
  return {
    pageContext: {
      pageProps,
    },
  };
}
