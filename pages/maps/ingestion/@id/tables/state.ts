/**
 * Instance-scoped Jotai state for the ingestion data-sheet page.
 *
 * The atoms defined here are module-level but are meant to be used *within* a
 * jotai `Provider` boundary (see `IngestTableProvider`), which scopes them per
 * table instance. This avoids the cross-instance leakage of the previous
 * module-global loader while keeping the ergonomics of plain atoms.
 *
 * View state (filters / sort / group / hidden columns) lives in atoms so the
 * contextual column header and toolbar actions can read and mutate it without
 * prop-threading. The loader's private fetch bookkeeping stays local to the
 * `useIngestData` hook.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { atom, useAtomValue, useStore } from "jotai";
import { addFilterToURL, createFiltersKey, Filter, submitChange } from "../utils";
import { Interval } from "../components";

export const PAGE_SIZE = 100;

/** A single-column sort request, mapped to the server's `order_by.<dir>`. */
export interface ColumnSort {
  key: string;
  ascending: boolean;
}

/** Default filter set: hide omitted rows. */
export function defaultFilters(): Record<string, Filter> {
  return { omit: new Filter("omit", "is_distinct_from", "true") };
}

/** Active per-column filters, keyed by column name (mirrors `DataParameters.filter`). */
export const filtersAtom = atom<Record<string, Filter>>(defaultFilters());

/** Active single-column sort (server-side), or null for default `_pkid` order. */
export const sortAtom = atom<ColumnSort | null>(null);

/** Column the table is currently grouped (aggregated) by, server-side. */
export const groupAtom = atom<string | undefined>(undefined);

/** Columns hidden from view (not sent to the server; purely presentational). */
export const hiddenColumnsAtom = atom<string[]>([]);

/** User-defined column order (list of keys), or null for the default
 * final-columns-first order. Captured from data-sheet's in-store reorder so it
 * survives the loader re-initializing the column spec on each page load. */
export const columnOrderAtom = atom<string[] | null>(null);

/** Whether selecting a cell auto-focuses its editor. Default false =
 * click-to-focus. */
export const autoFocusEditorAtom = atom(false);

/** Reference data: interval definitions, populated once per table (polygons). */
export const intervalsAtom = atom<Interval[]>([]);

/** Whether omitted rows are currently shown (drives the `omit` filter). */
export const showOmittedAtom = atom(
  (get) => get(filtersAtom)["omit"]?.is_valid() !== true,
);

/** Build a query URL against the polymorphic ingestion endpoint.
 *
 * Encodes the same vocabulary as the legacy `buildURL`: per-column filters as
 * `col=op.value`, sort as `col=order_by.<asc|desc>`, and grouping as
 * `col=group_by`. When grouped, ordering follows the group column (matching
 * the server's aggregation contract).
 */
export function buildIngestURL(
  baseURL: string,
  params: {
    filters: Record<string, Filter>;
    sort: ColumnSort | null;
    group: string | undefined;
    page: number;
    pageSize: number;
  },
): URL {
  const { filters, sort, group, page, pageSize } = params;
  let url = new URL(baseURL);

  if (group != null) {
    url.searchParams.append(group, "order_by.asc");
    url.searchParams.append(group, "group_by");
  } else if (sort != null) {
    url.searchParams.append(
      sort.key,
      `order_by.${sort.ascending ? "asc" : "desc"}`,
    );
    if (sort.key !== "_pkid") {
      url.searchParams.append("_pkid", "order_by.asc");
    }
  } else {
    url.searchParams.append("_pkid", "order_by.asc");
  }

  url.searchParams.append("page", page.toString());
  url.searchParams.append("page_size", pageSize.toString());

  for (const filter of Object.values(filters)) {
    url = addFilterToURL(url, filter);
  }

  return url;
}

async function fetchIngestPage(
  baseURL: string,
  params: Parameters<typeof buildIngestURL>[1],
): Promise<{ data: any[]; total: number | null }> {
  const url = buildIngestURL(baseURL, params);
  const response = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  const data = await response.json();
  const totalHeader = parseInt(response.headers.get("X-Total-Count") ?? "");
  return { data, total: Number.isNaN(totalHeader) ? null : totalHeader };
}

export interface IngestData {
  /** Rows loaded so far (grows as the user scrolls). */
  data: any[];
  /** Total row count for the current query, from `X-Total-Count`. */
  total: number | null;
  loading: boolean;
  /** Load the next page (no-op while loading or once exhausted). */
  loadMore: () => void;
  /** Discard loaded rows and re-fetch from the first page. */
  reload: () => void;
  /** Drop rows from the loaded cache by object reference (optimistic omit). */
  removeRows: (rows: any[]) => void;
  /** Patch loaded rows in place by object reference (optimistic restore). */
  patchRows: (rows: any[], patch: Record<string, any>) => void;
}

/** Lazy, filter/sort/group-aware loader for a single ingestion feature table.
 *
 * Resets and re-fetches whenever the active query (filters/sort/group) changes,
 * and appends further pages on demand via `loadMore`.
 */
export function useIngestData(url: string): IngestData {
  const filters = useAtomValue(filtersAtom);
  const sort = useAtomValue(sortAtom);
  const group = useAtomValue(groupAtom);

  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // Private cursor bookkeeping — refs so the load callback stays stable
  const loadingRef = useRef(false);
  const doneRef = useRef(false);
  const pageRef = useRef(0);

  const queryKey = [
    createFiltersKey(Object.values(filters)),
    sort ? `${sort.key}.${sort.ascending ? "asc" : "desc"}` : "",
    group ?? "",
  ].join("|");

  const load = useCallback(
    async (reset: boolean) => {
      if (loadingRef.current) return;
      if (!reset && doneRef.current) return;

      loadingRef.current = true;
      setLoading(true);
      const page = reset ? 0 : pageRef.current;

      try {
        const { data: rows, total: newTotal } = await fetchIngestPage(url, {
          filters,
          sort,
          group,
          page,
          pageSize: PAGE_SIZE,
        });
        doneRef.current = rows.length < PAGE_SIZE;
        pageRef.current = page + 1;
        if (newTotal != null) setTotal(newTotal);
        setData((prev) =>
          reset ? rows : [...prev.filter((r) => r != null), ...rows],
        );
      } finally {
        loadingRef.current = false;
        setLoading(false);
      }
    },
    [url, filters, sort, group],
  );

  // Reset and reload whenever the query changes
  useEffect(() => {
    doneRef.current = false;
    pageRef.current = 0;
    setData([]);
    setTotal(null);
    load(true);
    // `load` changes exactly when the query does, so keying on it is sufficient
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey]);

  const loadMore = useCallback(() => load(false), [load]);
  const reload = useCallback(() => {
    doneRef.current = false;
    pageRef.current = 0;
    load(true);
  }, [load]);

  // Drop rows from the loaded cache by object reference (used for optimistic
  // omit). Reference identity is used rather than `_pkid` so this is correct in
  // grouped mode too, where aggregated rows share/lack a `_pkid` — the store
  // rows are the same objects as this cache.
  const removeRows = useCallback((rows: any[]) => {
    const s = new Set(rows);
    setData((prev) => prev.filter((r) => !s.has(r)));
    setTotal((t) => (t == null ? t : Math.max(0, t - rows.length)));
  }, []);

  // Patch loaded rows in place by object reference (used for optimistic restore).
  const patchRows = useCallback((rows: any[], patch: Record<string, any>) => {
    const s = new Set(rows);
    setData((prev) =>
      prev.map((r) => (s.has(r) ? { ...r, ...patch } : r)),
    );
  }, []);

  return { data, total, loading, loadMore, reload, removeRows, patchRows };
}

/** The filter that identifies which server rows a given (base) row maps to.
 *
 * When grouped, an edit targets *every* row sharing the group value (bulk edit);
 * otherwise it targets the single row by its `_pkid`. Mirrors the legacy
 * `createTableUpdate` semantics.
 */
function identityFilter(
  baseRow: Record<string, any>,
  group: string | undefined,
): Record<string, Filter> {
  if (group != null) {
    const value = baseRow[group];
    if (value == null) {
      return { [group]: new Filter(group, "is", "null") };
    }
    return { [group]: new Filter(group, "eq", value) };
  }
  return { _pkid: new Filter("_pkid", "eq", baseRow["_pkid"]) };
}

/** Persist a data-sheet update overlay to the ingestion endpoint.
 *
 * `updates` is the sparse `updatedData` array (row index → partial row) and
 * `data` is the base data. Each changed cell becomes a filter-scoped PATCH.
 * Returns the number of columns successfully written.
 */
export async function saveIngestUpdates(
  url: string,
  updates: any[],
  data: any[],
  group: string | undefined,
): Promise<number> {
  const isEmpty = (v: any) => v == null || v === "";
  let count = 0;
  for (const [rowIndexStr, partial] of Object.entries(updates)) {
    if (partial == null) continue;
    const rowIndex = Number(rowIndexStr);
    const baseRow = data[rowIndex];
    if (baseRow == null) continue;
    const filters = identityFilter(baseRow, group);
    for (const [column, value] of Object.entries(partial)) {
      // Skip no-op edits, including the empty↔null "phantom" edits produced by
      // focusing and blurring an empty cell (which would otherwise PATCH an
      // empty string into non-text columns and fail).
      const current = baseRow[column];
      if (value === current || (isEmpty(value) && isEmpty(current))) continue;
      await submitChange(url, value as string, [column], filters);
      count += 1;
    }
  }
  return count;
}

/** PATCH a single column to a fixed value for a set of (base) rows, each
 * scoped by its identity filter. Used by the immediate omit/restore actions. */
export async function patchColumnForRows(
  url: string,
  baseRows: Record<string, any>[],
  column: string,
  value: any,
  group: string | undefined,
): Promise<number> {
  let count = 0;
  for (const row of baseRows) {
    await submitChange(url, value, [column], identityFilter(row, group));
    count += 1;
  }
  return count;
}

/** Reset the (default-store) view-state atoms when the active table changes,
 * so filters / sort / group don't leak between the polygon / line / point
 * routes. The atoms live on jotai's default store rather than a dedicated
 * Provider, since data-sheet runs its own isolated store and nesting a plain
 * jotai Provider around it breaks its internal store access.
 */
export function useResetIngestState(url: string) {
  const store = useStore();
  useEffect(() => {
    store.set(filtersAtom, defaultFilters());
    store.set(sortAtom, null);
    store.set(groupAtom, undefined);
    store.set(hiddenColumnsAtom, []);
    store.set(columnOrderAtom, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);
}
