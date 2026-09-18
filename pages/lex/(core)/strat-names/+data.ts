import { postgrestPrefix } from "@macrostrat-web/settings";
import { searchParams } from "~/components/knowledge-graph/route";
import {
  parseStratEntryType,
  STRAT_LIST_PAGE_SIZE,
  stratListQuery,
} from "./query";

/** Seed the first page of the list on the server, so the HTML carries real
 * rows rather than the panel's empty state. The query mirrors what the client
 * provider would request for the same view — the same order, search and type
 * scope — so mounting doesn't immediately re-fetch what we just sent.
 */
export async function data(pageContext) {
  const params = searchParams(pageContext);

  const url = `${postgrestPrefix}/strat_combined?${stratListQuery({
    query: (params.get("q") ?? "").trim(),
    type: parseStratEntryType(params.get("type")),
    limit: STRAT_LIST_PAGE_SIZE,
  })}`;

  const res = await fetch(url, { headers: { Prefer: "count=exact" } });
  if (!res.ok) {
    // The list's PostgREST views are not deployed in every environment; a
    // missing one shouldn't 500 the page. The panel loads client-side and
    // reports the error itself.
    return { initialRows: null, totalCount: null };
  }

  const initialRows = await res.json();
  return { initialRows, totalCount: totalFromContentRange(res) };
}

/** `items 0-49/46345` → 46345. */
function totalFromContentRange(res: Response): number | null {
  const range = res.headers.get("content-range");
  const total = Number(range?.split("/")?.[1]);
  return Number.isFinite(total) ? total : null;
}
