/**
 * Coupled state for the ingestion list, as jotai atoms.
 *
 * Two families live here, and they are read with *different* hooks:
 *
 *  - **Data-view state** (`selectedMapsAtom`, `refreshRowsAtom`) derives from
 *    the data-sheet's own store, reachable through the library's exported
 *    `storeAtom`. These are scoped to the view, so read them with the library's
 *    scoped-store hooks (`ctx.useValue` / `ctx.use` / `ctx.useSet`) — plain
 *    `useAtomValue` would resolve against the global store, where the view's
 *    atoms are unset.
 *
 * Facet vocabularies used to live here too, as async atoms over hand-rolled
 * queries. They don't any more: the provider answers `distinctValues(columnKey)`
 * and the library's `useDistinctValues` caches it per view, so a picker asks the
 * column what it holds.
 */
import { atom } from "jotai";
import { getSelectedRowIndices, storeAtom } from "@macrostrat/data-sheet";

/** The rows currently selected, resolved from the store's selection regions. */
export const selectedMapsAtom = atom((get) => {
  const store = get(storeAtom);
  if (store == null) return [];
  const data = store.data ?? [];
  return getSelectedRowIndices(store.selection ?? [])
    .map((i: number) => data[i])
    .filter(Boolean);
});

/** Refresh the loaded rows (after a tag write, say). */
export const refreshRowsAtom = atom(null, (get) => {
  get(storeAtom)?.rowEditing?.refresh?.();
});

/** The `state` value standing in for maps with no status at all — not a value
 * the column holds, so it's appended to what `distinctValues` reports. */
export const NO_STATUS = "(none)";
