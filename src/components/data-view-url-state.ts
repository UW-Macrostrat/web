/**
 * Two-way sync between a `DataPanel`/`DataSheet`'s **view state** (active
 * filters + column sorts) and the page's **URL query string**, so a particular
 * set of rows is linkable, bookmarkable, and survives a reload.
 *
 * Mount `ViewStateURLSync` *inside* the data view (the `children` prop renders
 * within the provider), and describe each filter's URL representation with a
 * {@link FilterURLBinding}. Sorts are handled generically (`?sort=-ref_year,name`).
 *
 * ## How the sync settles
 * Both directions are compared as **serialized params**, never as state objects:
 *  - the URL is the newcomer on mount and on back/forward → it hydrates the store,
 *  - afterwards a view-state change writes the URL (`replace`, so view state
 *    doesn't flood the history stack).
 *
 * That comparison is what keeps this from looping (a write echoes back as a
 * location change) and — just as important — from re-setting a filter to an
 * equal-but-new state object, which would invalidate the loader's view key and
 * trigger a redundant refetch.
 */
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useAtom } from "jotai";
import {
  type ActiveFilterEntry,
  type ColumnSort,
  type TableFilter,
  useSelector,
  useStoreAPI,
} from "@macrostrat/data-sheet";
import { locationAtom } from "~/_utils/url-atoms";

/** A record of the query params owned by a binding (`null` = absent). */
export type ParamValues = Record<string, string | null>;

/**
 * How one filter is represented in the URL. A filter may own several params
 * (e.g. an omni-search that carries both a text query and a tag set), which is
 * why this maps state ⇄ a *record* rather than a single value.
 */
export interface FilterURLBinding<S = any> {
  /** The filter definition — needed to (re)activate it from the URL. */
  filter: TableFilter<any, S>;
  /** Every query param this filter owns. Params are cleared when it's inactive. */
  params: string[];
  /** state → params. Return `null`/`""` for a param that should be absent. */
  toParams(state: S): ParamValues;
  /** params → state. Return `null` when the params describe no filter. */
  fromParams(values: ParamValues): S | null;
}

export interface ViewStateURLSyncProps {
  /** URL representation for each filter that should be linkable. Filters
   * without a binding simply aren't reflected in the URL. */
  bindings?: FilterURLBinding[];
  /** Param holding the sort list (`-key` = descending). `null` to not sync sorts. */
  sortParam?: string | null;
}

/** Renders nothing; syncs the enclosing data view's filters + sorts to the URL. */
export function ViewStateURLSync({
  bindings = [],
  sortParam = "sort",
}: ViewStateURLSyncProps) {
  const store = useStoreAPI();
  const activeFilters = useSelector((s: any) => s.activeFilters);
  const columnSorts = useSelector((s: any) => s.columnSorts);
  const [location, setLocation] = useAtom(locationAtom);
  // The params string last reconciled in either direction — the discriminator
  // between "the URL changed under us" and "the view state changed".
  const lastSyncedRef = useRef<string | null>(null);

  const ownedParams = useMemo(
    () => collectOwnedParams(bindings, sortParam),
    [bindings, sortParam]
  );

  const fromStore = useMemo(
    () => paramsFromViewState(bindings, sortParam, activeFilters, columnSorts),
    [bindings, sortParam, activeFilters, columnSorts]
  );

  const search = location.searchParams?.toString() ?? "";
  const fromURL = useMemo(
    () => readParams(new URLSearchParams(search), ownedParams),
    [search, ownedParams]
  );

  const writeURL = useCallback(
    (params: ParamValues) => {
      const searchParams = new URLSearchParams(location.searchParams);
      for (const [key, value] of Object.entries(params)) {
        if (value == null || value === "") {
          searchParams.delete(key);
        } else {
          searchParams.set(key, value);
        }
      }
      setLocation({ ...location, searchParams });
    },
    [location, setLocation]
  );

  useEffect(() => {
    const storeKey = canonicalize(fromStore);
    const urlKey = canonicalize(fromURL);
    if (storeKey === urlKey) {
      lastSyncedRef.current = urlKey;
      return;
    }
    if (lastSyncedRef.current !== urlKey) {
      // First mount, or an external navigation (back/forward): the URL wins.
      applyParamsToStore(store, bindings, sortParam, fromURL);
      lastSyncedRef.current = urlKey;
      return;
    }
    // The view state is what changed — publish it.
    lastSyncedRef.current = storeKey;
    writeURL(fromStore);
  }, [fromStore, fromURL, store, bindings, sortParam, writeURL]);

  return null;
}

/**
 * The same bindings read *once*, for a view's `initialFilters` / `initialSorts`.
 *
 * `ViewStateURLSync` can only apply URL state after mount, which means the view
 * fetches unfiltered first and immediately supersedes it. Passing the result of
 * this to the data view instead applies the restored view when the store is
 * *created*, so a linked view issues one correct request; the sync component then
 * has nothing to do on mount and takes over for later changes and back/forward.
 *
 * Pass `search` explicitly when the caller has it (a server render); otherwise
 * it reads the current location, and returns nothing when there is no window.
 */
export function initialViewStateFromURL(
  bindings: FilterURLBinding[],
  { sortParam = "sort", search }: InitialViewStateOptions = {}
): { initialFilters: ActiveFilterEntry[]; initialSorts: ColumnSort[] } {
  let query = search;
  if (query == null && typeof window !== "undefined") {
    query = window.location.search;
  }
  if (query == null) return { initialFilters: [], initialSorts: [] };

  const params = new URLSearchParams(query);
  const initialFilters: ActiveFilterEntry[] = [];
  for (const binding of bindings) {
    const state = binding.fromParams(readParams(params, binding.params));
    if (state == null) continue;
    initialFilters.push({ filter: binding.filter, state });
  }

  let initialSorts: ColumnSort[] = [];
  if (sortParam != null) initialSorts = parseSorts(params.get(sortParam));

  return { initialFilters, initialSorts };
}

export interface InitialViewStateOptions {
  sortParam?: string | null;
  /** Query string to read instead of the current location. */
  search?: string;
}

// ---- Sorts ----

/** `[{key: "ref_year", ascending: false}]` → `"-ref_year"`. */
export function serializeSorts(sorts: ColumnSort[]): string | null {
  if (sorts == null || sorts.length === 0) return null;
  return sorts.map((s) => (s.ascending ? "" : "-") + s.key).join(",");
}

export function parseSorts(value: string | null): ColumnSort[] {
  if (value == null || value === "") return [];
  return value
    .split(",")
    .map((tok) => tok.trim())
    .filter((tok) => tok !== "")
    .map((tok) => {
      if (tok.startsWith("-")) return { key: tok.slice(1), ascending: false };
      return { key: tok, ascending: true };
    });
}

// ---- Params ⇄ view state ----

function collectOwnedParams(
  bindings: FilterURLBinding[],
  sortParam: string | null
): string[] {
  const params = bindings.flatMap((b) => b.params);
  if (sortParam != null) params.push(sortParam);
  return [...new Set(params)];
}

/** Params for one binding, with every owned param present (absent ⇒ `null`). */
function paramsForBinding(binding: FilterURLBinding, state: any): ParamValues {
  const base: ParamValues = Object.fromEntries(
    binding.params.map((p) => [p, null])
  );
  if (state == null) return base;
  return { ...base, ...binding.toParams(state) };
}

function paramsFromViewState(
  bindings: FilterURLBinding[],
  sortParam: string | null,
  activeFilters: Map<string, { filter: any; state: any }>,
  columnSorts: ColumnSort[]
): ParamValues {
  const out: ParamValues = {};
  for (const binding of bindings) {
    const entry = activeFilters?.get(binding.filter.id);
    Object.assign(out, paramsForBinding(binding, entry?.state ?? null));
  }
  if (sortParam != null) out[sortParam] = serializeSorts(columnSorts);
  return out;
}

function readParams(
  searchParams: URLSearchParams,
  owned: string[]
): ParamValues {
  return Object.fromEntries(owned.map((p) => [p, searchParams.get(p) ?? null]));
}

/** A stable string for a param record, so the two directions compare cleanly. */
function canonicalize(params: ParamValues): string {
  return Object.keys(params)
    .sort()
    .filter((k) => params[k] != null && params[k] !== "")
    .map((k) => `${k}=${params[k]}`)
    .join("&");
}

function pick(params: ParamValues, keys: string[]): ParamValues {
  return Object.fromEntries(keys.map((k) => [k, params[k] ?? null]));
}

function applyParamsToStore(
  store: any,
  bindings: FilterURLBinding[],
  sortParam: string | null,
  params: ParamValues
) {
  for (const binding of bindings) {
    const desired = binding.fromParams(pick(params, binding.params));
    const current = store.getState().activeFilters?.get(binding.filter.id);
    // Compare through the binding's own serialization: an equal-but-new state
    // object would reset the loader for nothing.
    const isSame =
      canonicalize(paramsForBinding(binding, desired)) ===
      canonicalize(paramsForBinding(binding, current?.state ?? null));
    if (isSame) continue;
    if (desired == null) {
      store.getState().removeFilter(binding.filter.id);
    } else {
      store.getState().setFilter(binding.filter.id, binding.filter, desired);
    }
  }

  if (sortParam == null) return;
  const desiredSorts = parseSorts(params[sortParam]);
  const currentSorts = store.getState().columnSorts ?? [];
  if (serializeSorts(desiredSorts) === serializeSorts(currentSorts)) return;
  store.getState().clearColumnSorts();
  for (const sort of desiredSorts) {
    store.getState().setColumnSort(sort.key, sort.ascending);
  }
}
