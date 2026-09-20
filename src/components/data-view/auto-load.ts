/** How far a lazily-paged list scrolls on its own before it pauses.
 *
 * `DataPanel` counts this in **pages**, which is the wrong unit to reason about
 * from a page's point of view: the same `autoLoadPages` means 40 rows on one
 * list and 500 on another purely because their page sizes differ. What a view
 * actually wants to say is "let the reader scroll a few hundred entries, then
 * stop and show them the footer" — deep results are reached by narrowing the
 * search, not by scrolling forever, and the footer needs to be reachable at all.
 *
 * So views state a row budget and convert it here.
 */

/** Rows a list auto-loads before pausing for the footer's "Load more". Chosen to
 * be several screens of scrolling — enough that the pause reads as a checkpoint
 * rather than a speed bump — while keeping the footer reachable. */
export const DEFAULT_AUTO_LOAD_ITEMS = 200;

/**
 * `autoLoadPages` for a row budget: the number of whole pages that fits in
 * `items`, and never less than one (a page size larger than the budget would
 * otherwise round down to zero, which reads as "pause immediately").
 */
export function autoLoadPagesForItems(
  pageSize: number,
  items: number = DEFAULT_AUTO_LOAD_ITEMS
): number {
  if (!Number.isFinite(pageSize) || pageSize <= 0) return 1;
  return Math.max(1, Math.floor(items / pageSize));
}
