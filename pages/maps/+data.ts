import { postgrest } from "~/_providers";

export async function data(pageContext) {
  // `.page.server.js` files always run in Node.js; we could use SQL/ORM queries here.

  const res = await postgrest
    .from("sources_metadata")
    .select("*")
    .eq("is_finalized", true)
    .eq("status_code", "active")
    .order("source_id", { ascending: true })
    .limit(20);

  return { sources: res.data };
}
