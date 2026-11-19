/** State derived from the data sheet's own store. Scoped to the sheet, so read
 * it with the library's `ctx` hooks, never plain `useAtomValue`. */
import { atom } from "jotai";
import { getSelectedRowIndices, storeAtom } from "@macrostrat/data-sheet";
import type { RasterRow } from "./api";

export const selectedRastersAtom = atom((get): RasterRow[] => {
  const store = get(storeAtom);
  if (store == null) return [];
  const data = store.data ?? [];
  return getSelectedRowIndices(store.selection ?? [])
    .map((i: number) => data[i])
    .filter(Boolean);
});

export const refreshRowsAtom = atom(null, (get) => {
  get(storeAtom)?.rowEditing?.refresh?.();
});
