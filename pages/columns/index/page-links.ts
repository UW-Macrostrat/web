/** Crawlable paging for the column list.
 *
 * The list scrolls infinitely for readers, but a crawler only sees the
 * server-rendered HTML. So every page of the list is also a URL — `?after=<col_id>`
 * starts the list after that column — and each rendered page carries a hidden
 * link to the next one (the data panel's `pageLinks`). The cursor is read from
 * the URL only when the page loads; the client never writes it while scrolling,
 * and drops it as soon as it rewrites the URL for any other reason (a search, a
 * project change), so deep pages are for crawlers and for whoever follows such
 * a link — not a state the page keeps.
 */

import { rowsAfter } from "@macrostrat/data-sheet";

export const START_AFTER_KEY = "after";

/** Where the page was requested: its path and query, as `+data.ts` saw them. */
export interface PageLocation {
  pathname: string;
  search: Record<string, string>;
}

/** The `?after=` cursor: a column id, or `null` when absent or malformed. */
export function parseStartAfter(value: string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const id = Number.parseInt(value, 10);
  if (!Number.isFinite(id) || id <= 0) return null;
  return id;
}

/** The page's own URL with some query parameters changed (`null` removes). */
export function hrefWithParams(
  location: PageLocation | null,
  changes: Record<string, string | number | null>
): string {
  const params = new URLSearchParams(location?.search ?? {});
  for (const [key, value] of Object.entries(changes)) {
    if (value == null) {
      params.delete(key);
    } else {
      params.set(key, String(value));
    }
  }
  const query = params.toString();
  const pathname = location?.pathname ?? "";
  if (query === "") return pathname === "" ? "?" : pathname;
  return `${pathname}?${query}`;
}

/** Links the data panel renders: the hidden next-page link after the loaded
 * rows, and "Return to top" while the view starts mid-list. */
export function columnPageLinks(location: PageLocation | null) {
  return {
    after: (row: { col_id: number }) =>
      hrefWithParams(location, { [START_AFTER_KEY]: row.col_id }),
    top: hrefWithParams(location, { [START_AFTER_KEY]: null }),
  };
}

/** The rows past the column `after`; all of them when it is absent or not in
 * the list. The library's own rule — the one the panel's provider applies for
 * its chunks — so the seeded first page and the chunks after it agree. */
export function rowsAfterColumn<T extends { col_id: number }>(
  rows: T[],
  after: number | null
): T[] {
  return rowsAfter(rows, after, (row) => row.col_id);
}
