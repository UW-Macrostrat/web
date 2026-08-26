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
 *  - **Reference data** (`ingestStatesAtom`) is app-wide and async, so it's a
 *    plain jotai atom read with `useAtomValue` in the global store — one fetch
 *    per session, shared by every consumer, no module-level cache and no
 *    per-component `useState`/`useEffect` pair.
 */
import { atom } from "jotai";
import { atomWithRefresh, loadable } from "jotai/utils";
import { getSelectedRowIndices, storeAtom } from "@macrostrat/data-sheet";
import { apiV3Prefix } from "@macrostrat-web/settings";

const endpoint = `${apiV3Prefix}/map-ingestion/pg`;

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

// ---- Reference data ----

/** The `state` value used for maps with no status at all. */
export const NO_STATUS = "(none)";

/**
 * Distinct `state` values present in the queue. These are data, not a fixed
 * enum — the legacy page hard-coded a list that had silently drifted — so they
 * come from the live route, with `NO_STATUS` appended because a large share of
 * the queue has no status.
 */
const ingestStatesSourceAtom = atomWithRefresh(async (): Promise<string[]> => {
  const res = await fetch(`${endpoint}/maps?select=state`);
  if (!res.ok) throw new Error(`Couldn't load statuses (${res.status})`);
  const rows: { state: string | null }[] = await res.json();
  const named = [...new Set(rows.map((r) => r.state).filter(Boolean))].sort();
  return [...(named as string[]), NO_STATUS];
});

/** Non-suspending view of {@link ingestStatesSourceAtom}. */
export const ingestStatesAtom = loadable(ingestStatesSourceAtom);

/**
 * The publication years present in the queue, newest first — so the year filter
 * offers only values that match something. `ref_year` is a *text* column and
 * carries some junk (the literal string `"None"`, an out-of-range `2106`), so
 * this keeps four-digit values only.
 */
const ingestYearsSourceAtom = atomWithRefresh(async (): Promise<string[]> => {
  const res = await fetch(`${endpoint}/maps?select=ref_year`);
  if (!res.ok) throw new Error(`Couldn't load years (${res.status})`);
  const rows: { ref_year: string | null }[] = await res.json();
  const years = new Set<string>();
  for (const row of rows) {
    const year = row.ref_year?.trim();
    if (year != null && /^\d{4}$/.test(year)) years.add(year);
  }
  return [...years].sort().reverse();
});

/** Non-suspending view of {@link ingestYearsSourceAtom}. */
export const ingestYearsAtom = loadable(ingestYearsSourceAtom);
