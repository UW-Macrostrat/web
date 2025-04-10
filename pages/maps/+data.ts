import { postgrest } from "~/_providers";

export async function data(pageContext) {
  // `.page.server.js` files always run in Node.js; we could use SQL/ORM queries here.

  const res = await postgrest
    .from("sources_metadata")
    .select("*")
    .eq("is_finalized", true)
    .order("source_id", { ascending: true });

  return { sources: res.data };
}
