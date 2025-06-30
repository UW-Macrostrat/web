import { apiDomain } from "@macrostrat-web/settings";

export async function data(pageContext) {
  // `.page.server.js` files always run in Node.js; we could use SQL/ORM queries here.

  const params = new URLSearchParams({
    is_finalized: "eq.true",
    status_code: "eq.active",
    or: `(ref_year.lt.9999,and(ref_year.eq.9999,source_id.gt.0))`,
    limit: 20,
    order: "ref_year.desc,source_id.asc",
  }).toString()

  const res = await fetch(`${apiDomain}/api/pg/sources_metadata?${params}`)
  if (!res.ok) {
    throw new Error(`Failed to fetch data: ${res.statusText}`);
  }
  const data = await res.json();

  return { sources: data };
}
