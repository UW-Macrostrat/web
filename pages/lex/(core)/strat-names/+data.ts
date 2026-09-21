import { postgrestPrefix } from "@macrostrat-web/settings";
import { searchParams } from "~/components/knowledge-graph/route";
import {
  parseStratEntryType,
  STRAT_LIST_PAGE_SIZE,
  stratListQuery,
  stratListTable,
} from "./query";

/** Seed the first page of the list on the server, so the HTML carries real
 * rows rather than the panel's empty state. The query mirrors what the client
 * provider would request for the same view — the same source, order, search
 * and scope — so mounting doesn't immediately re-fetch what we just sent.
 *
 * The scope also picks the *table* (see `query.ts`), so the seed is tagged with
 * the scope it was fetched for; the page only uses it when the panel starts in
 * that same scope.
 */
export async function data(pageContext) {
  const params = searchParams(pageContext);
  const type = parseStratEntryType(params.get("type"));

  const query = stratListQuery({
    query: (params.get("q") ?? "").trim(),
    type,
    limit: STRAT_LIST_PAGE_SIZE,
  });
  const url = `${postgrestPrefix}/${stratListTable(type)}?${query}`;

  const res = await fetch(url, { headers: { Prefer: "count=exact" } });
  if (!res.ok) {
    // The concept source (`strat_combined`) is not deployed in every
    // environment; a missing one shouldn't 500 the page. The panel loads
    // client-side and reports the error itself.
    return { initialRows: null, totalCount: null, initialType: type };
  }

  const initialRows = await res.json();
  return {
    initialRows,
    totalCount: totalFromContentRange(res),
    initialType: type,
  };
}

/** `items 0-49/46345` → 46345. */
function totalFromContentRange(res: Response): number | null {
  const range = res.headers.get("content-range");
  const total = Number(range?.split("/")?.[1]);
  return Number.isFinite(total) ? total : null;
}
