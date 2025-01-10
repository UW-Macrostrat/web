import { postgrest } from "~/_providers";

export async function onBeforeRender(pageContext) {
  // `.page.server.js` files always run in Node.js; we could use SQL/ORM queries here.

  const res = await postgrest
    .from("sources_metadata")
    .select("*")
    .eq("is_finalized", true)
    .order("source_id", { ascending: true });

  const pageProps = { sources: res.data };
  return {
    pageContext: {
      pageProps,
    },
  };
}
