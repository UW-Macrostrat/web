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
 * prop-threading. The data-sheet `TableDataProvider` (`makeIngestProvider`)
 * reads that view state from the store at fetch time; the library owns the
 * windowed loading itself.
 */
import { useEffect, useRef } from "react";
import { atom, createStore, useAtom, useStore } from "jotai";
import { useAsyncEffect } from "@macrostrat/ui-components";
import type { TableDataProvider } from "@macrostrat/data-sheet";
import { addFilterToURL, Filter } from "../utils";
import { Interval } from "../components";
import { postgrest } from "~/_providers";

type JotaiStore = ReturnType<typeof createStore>;

export const PAGE_SIZE = 100;

/** The fixed system column — always pinned first and not reorderable. */
export const SYSTEM_COLUMN = "source_layer";

/** A single-column sort request, mapped to the server's `order_by.<dir>`. */
export interface ColumnSort {
  key: string;
  ascending: boolean;
}

/** The server filter that hides omitted rows — the default view. */
export function omitFilter(): Filter {
  return new Filter("omit", "is_distinct_from", "true");
}

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

/** In-progress save state (for the batch-save progress indicator), or null. */
export const saveProgressAtom = atom<{ text: string; value: number } | null>(
  null,
);

/** Bumped to force the data-sheet provider to re-fetch from scratch (e.g. after
 * a save). Fed into DataSheet's `refreshToken` alongside the query key. */
export const reloadNonceAtom = atom(0);

/** Whether omitted rows are currently shown. Default `false` = hidden (the
 * provider injects the `omit` filter unless this is on). */
export const showOmittedAtom = atom(false);

/** Mirror of the library's active column filters, translated to server
 * `Filter[]`, maintained by `ViewStateSync`. Lets the whole-column-copy action
 * scope its server-side copy to the current filtered view (the library owns the
 * filter state now, so the page reads it from here rather than an atom). */
export const activeServerFiltersAtom = atom<Filter[]>([]);

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
    filters: Filter[];
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

  for (const filter of filters) {
    url = addFilterToURL(url, filter);
  }

  return url;
}

/** Map a library filter operator to the ingestion server's operator set. */
const LIBRARY_TO_SERVER_OPERATOR: Record<string, string> = {
  eq: "eq",
  neq: "ne",
  gt: "gt",
  lt: "lt",
  gte: "ge",
  lte: "le",
  like: "like",
  ilike: "like",
  is: "is",
};

/** Translate one library column filter (`columnKey` + `{ operator, value }`
 * state) into a server `Filter`, or `null` if it carries no constraint. */
export function libraryFilterToServer(
  columnKey: string | undefined,
  state: any,
): Filter | null {
  if (columnKey == null || state == null) return null;
  const { operator, value } = state;
  if (value === "" || value == null) return null;
  const op = LIBRARY_TO_SERVER_OPERATOR[operator] ?? "eq";
  return new Filter(columnKey, op as any, value);
}

async function fetchIngestPage(
  baseURL: string,
  params: Parameters<typeof buildIngestURL>[1],
  signal?: AbortSignal,
): Promise<{ data: any[]; total: number | null }> {
  const url = buildIngestURL(baseURL, params);
  const response = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    signal,
  });
  const data = await response.json();
  const totalHeader = parseInt(response.headers.get("X-Total-Count") ?? "");
  return { data, total: Number.isNaN(totalHeader) ? null : totalHeader };
}

/** The data-sheet `TableDataProvider` for a feature table. The library owns
 * windowed loading (scroll + progress); this only translates a requested
 * window into the ingestion server's `page` / `page_size` vocabulary and reads
 * the active filters / sort / group from the store at call time (so a query
 * change + a `refreshToken` bump re-fetches with the current view state).
 *
 * `identity` is `_pkid`; there are no `saveRows` / `deleteRows` — persistence
 * is the page's own ops-stack Save (see `actions.ts`), which reloads via
 * `reloadNonceAtom` → `refreshToken`.
 */
export function makeIngestProvider(
  baseURL: string,
  store: JotaiStore,
): TableDataProvider {
  return {
    identity: (row: any) => row?._pkid,
    async fetchData({ offset, limit, signal, sorts, filters }) {
      // Sort/filter are owned by the library store (passed here); group and the
      // omit view-toggle stay page-side (read from atoms at fetch time).
      const group = store.get(groupAtom);
      const showOmitted = store.get(showOmittedAtom);
      const serverFilters = filters
        .map((f) => libraryFilterToServer(f.columnKey, f.state))
        .filter((x): x is Filter => x != null);
      if (!showOmitted) serverFilters.push(omitFilter());
      const sort =
        sorts.length > 0
          ? { key: sorts[0].key, ascending: sorts[0].ascending }
          : null;
      const page = Math.floor(offset / limit);
      const { data, total } = await fetchIngestPage(
        baseURL,
        { filters: serverFilters, sort, group, page, pageSize: limit },
        signal,
      );
      return { rows: data, totalCount: total };
    },
  };
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
    store.set(groupAtom, undefined);
    store.set(showOmittedAtom, false);
    store.set(hiddenColumnsAtom, []);
    store.set(columnOrderAtom, null);
    // Sort/filter live in the data-sheet's own store now (reset when the table
    // remounts on route change), so they aren't reset here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);
}

/** Persist hidden columns + column order per ingest process / feature type to
 * `map_ingest_metadata.{feature}_state`, so they survive reloads. Loads on
 * mount (and when the process/feature changes) and saves (debounced) on change.
 */
export function useTableStatePersistence(
  ingestProcessId: number,
  featureType: string,
) {
  const [hidden, setHidden] = useAtom(hiddenColumnsAtom);
  const [order, setOrder] = useAtom(columnOrderAtom);
  const columnName = `${featureType}_state`;
  // Only save once we've loaded state for *this* process, so the reset-on-mount
  // and cross-feature switches don't clobber stored state before it loads.
  const loadedForRef = useRef<number | null>(null);

  useAsyncEffect(async () => {
    loadedForRef.current = null;
    try {
      const res = await postgrest
        .from("map_ingest_metadata")
        .select(columnName)
        .eq("id", ingestProcessId)
        .maybeSingle();
      const state = (res.data?.[columnName] ?? {}) as any;
      setHidden(Array.isArray(state.hiddenColumns) ? state.hiddenColumns : []);
      setOrder(Array.isArray(state.columnOrder) ? state.columnOrder : null);
    } catch (err) {
      console.error("Failed to load table state", err);
    }
    loadedForRef.current = ingestProcessId;
  }, [ingestProcessId, featureType]);

  useEffect(() => {
    if (loadedForRef.current !== ingestProcessId) return;
    const value = { hiddenColumns: hidden, columnOrder: order };
    const timer = setTimeout(async () => {
      // Update the existing row; `.select` tells us whether a row matched.
      // postgrest resolves with `{ data, error }` (it does not reject on API
      // errors), so we must inspect `error` explicitly.
      const { data, error } = await postgrest
        .from("map_ingest_metadata")
        .update({ [columnName]: value })
        .eq("id", ingestProcessId)
        .select("id");
      if (error) {
        console.error("Failed to save table state", error);
        return;
      }
      if (data == null || data.length === 0) {
        // No metadata row for this ingest process yet — create it.
        const { error: insertError } = await postgrest
          .from("map_ingest_metadata")
          .upsert({ id: ingestProcessId, [columnName]: value });
        if (insertError) {
          console.error("Failed to create table state row", insertError);
        }
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [hidden, order, ingestProcessId, columnName]);
}
