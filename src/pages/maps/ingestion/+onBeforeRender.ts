import { ingestPrefix, postgrestPrefix } from "@macrostrat-web/settings";
import fetch from "node-fetch";
import { PostgrestClient } from "@supabase/postgrest-js";

const postgrest = new PostgrestClient(postgrestPrefix);

export async function onBeforeRender(pageContext) {
  // // `.page.server.js` files always run in Node.js; we could use SQL/ORM queries here.
  // const response = await fetch(
  //   `${ingestPrefix}/ingest-process?source_id=not.is.null&state=eq.ingested&page_size=1000`
  // );
  // const ingest_processes = await response.json();

  // const sources = await Promise.all(
  //   ingest_processes.map(async (x) => {
  //     const source_id = x.source_id;
  //     const response = await fetch(`${ingestPrefix}/sources/${source_id}`);

  //     const data = await response.json();

  //     return data;
  //   })
  // );

  const res = await postgrest
    .from("sources_ingestion")
    .select("*")
    .order("source_id", { ascending: false });

  console.log(res);

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
