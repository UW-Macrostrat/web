import { Button, OverlayToaster, Spinner, Switch, Tag } from "@blueprintjs/core";
import { RegionCardinality } from "@blueprintjs/table";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { useAtom, useAtomValue, useSetAtom, useStore } from "jotai";
import {
  DataSheet,
  generateColumnSpec,
  TableElementStatus,
  useSelector,
  useStoreAPI,
  type ColumnSpec,
} from "@macrostrat/data-sheet";
import { createAppToaster } from "@macrostrat/ui-components";
import { FeatureType } from "./defs";
import { toBoolean } from "../components";
import {
  autoFocusEditorAtom,
  columnOrderAtom,
  defaultFilters,
  filtersAtom,
  groupAtom,
  hiddenColumnsAtom,
  sortAtom,
  useIngestData,
  useResetIngestState,
} from "./state";
import { makeIngestActions } from "./actions";
import { makeColumnHeaderRenderer } from "./column-header";
import { ColumnControls } from "./column-controls";
import h from "../hyper";

/** Human-readable labels for the ingestion filter operators. */
const OPERATOR_LABELS: Record<string, string> = {
  eq: "=",
  ne: "≠",
  lt: "<",
  le: "≤",
  gt: ">",
  ge: "≥",
  like: "contains",
  in: "in",
  is: "is",
  is_distinct_from: "≠",
  is_not_distinct_from: "=",
};

/** Columns present in the data but never shown directly (identity / control).
 * `omit` is controlled via the Omit/Restore actions (row-deletion mechanism). */
const INTERNAL_COLUMNS = ["_pkid", "source_id", "omit"];

/** Wrap a column's valueRenderer so a bad value (e.g. an edited string in a
 * column whose default renderer calls `toFixed`) degrades to the raw value
 * instead of throwing and blanking the table. */
function safeRenderer(fn: ((d: any) => any) | undefined) {
  if (fn == null) return fn;
  return (d: any) => {
    try {
      return fn(d);
    } catch {
      return d == null ? d : String(d);
    }
  };
}

/** Default order: final (harmonized) columns first, in `finalColumns` order,
 * then the remaining columns in their natural order (both stable). */
function orderByFinal<T extends { key: string }>(
  cols: T[],
  finalColumns: string[],
): T[] {
  const idx = new Map(finalColumns.map((k, i) => [k, i]));
  return [...cols].sort((a, b) => {
    const fa = idx.has(a.key);
    const fb = idx.has(b.key);
    if (fa && fb) return (idx.get(a.key) ?? 0) - (idx.get(b.key) ?? 0);
    if (fa) return -1;
    if (fb) return 1;
    return 0;
  });
}

/** Order by an explicit key list (user reorder); unlisted columns keep their
 * natural order at the end. */
function orderByKeys<T extends { key: string }>(
  cols: T[],
  order: string[],
): T[] {
  const idx = new Map(order.map((k, i) => [k, i]));
  return [...cols].sort((a, b) => {
    const ia = idx.has(a.key) ? (idx.get(a.key) as number) : Infinity;
    const ib = idx.has(b.key) ? (idx.get(b.key) as number) : Infinity;
    return ia - ib;
  });
}

/** Resolve an OverlayToaster instance. In Blueprint v6 `OverlayToaster.create()`
 * (via `createAppToaster`) returns a Promise, so we resolve it once on mount.
 * Note: we do NOT pass this to DataSheet's `toaster` prop — a promise there
 * would make its toaster atom async and break its scoped store. */
function useToasterInstance(): OverlayToaster | null {
  const [toaster, setToaster] = useState<OverlayToaster | null>(null);
  useEffect(() => {
    let active = true;
    Promise.resolve(createAppToaster()).then((t) => {
      if (active) setToaster(t as OverlayToaster);
    });
    return () => {
      active = false;
    };
  }, []);
  return toaster;
}

export interface EditTableProps {
  url: string;
  ingestProcessId: number;
  featureType: FeatureType;
  /** Columns considered "final" / harmonized (starred in the header). */
  finalColumns: string[];
  /** Per-column ColumnSpec overrides (names, read-only flags, editors). */
  overrides?: Record<string, Partial<ColumnSpec> | string>;
}

export function TableInterface({
  url,
  finalColumns,
  overrides = {},
}: EditTableProps) {
  useResetIngestState(url);
  const store = useStore();
  const toaster = useToasterInstance();
  const hiddenColumns = useAtomValue(hiddenColumnsAtom);
  const columnOrder = useAtomValue(columnOrderAtom);
  const autoFocusEditor = useAtomValue(autoFocusEditorAtom);
  const { data, total, loading, loadMore, reload, removeRows, patchRows } =
    useIngestData(url);

  const actions = useMemo(
    () =>
      makeIngestActions({ url, store, reload, removeRows, patchRows, toaster }),
    [url, store, reload, removeRows, patchRows, toaster],
  );

  const columnHeaderCellRenderer = useMemo(
    () => makeColumnHeaderRenderer(finalColumns),
    [finalColumns],
  );

  // Build a stable column spec from the loaded rows. Client-side sort/filter is
  // disabled here (`sortable`/`filterable` = false) because sorting and
  // filtering happen server-side via the column-header dropdowns. Hidden
  // columns (and internal identity columns) are dropped from the view.
  const columnKeys = data.length === 0 ? "" : Object.keys(data[0] ?? {}).join();
  const hiddenKey = hiddenColumns.join();
  const orderKey = columnOrder?.join() ?? "";
  const columnSpec = useMemo(() => {
    const spec = generateColumnSpec(data, {
      overrides,
      omitColumns: [...INTERNAL_COLUMNS, ...hiddenColumns],
    });
    const normalized = spec.map((col) => ({
      ...col,
      sortable: false,
      filterable: false,
      valueRenderer: safeRenderer(col.valueRenderer),
    }));
    // A saved (user) order takes precedence; otherwise final columns lead.
    return columnOrder != null
      ? orderByKeys(normalized, columnOrder)
      : orderByFinal(normalized, finalColumns);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnKeys, hiddenKey, orderKey, overrides, finalColumns]);

  return h(DataSheet, {
    data,
    columnSpec,
    editable: true,
    actions,
    columnHeaderCellRenderer,
    enableColumnReordering: true,
    autoFocusEditor,
    dataSheetActions: h("div.ingest-top", [
      h(ColumnControls),
      h("div.ingest-toolbar", [
        h(FilterStatusBar),
        h("div.ingest-toolbar-right", [
          h(EditorFocusToggle),
          h(StatusBar, { total, loading, loaded: data.length }),
        ]),
      ]),
    ]),
    onVisibleCellsChange: (visibleCells) => {
      if (visibleCells.rowIndexEnd > data.length - 20) {
        loadMore();
      }
    },
    selectionModes: [RegionCardinality.FULL_COLUMNS, RegionCardinality.FULL_ROWS],
  }, h(StoreSync));
}

const isEmptyValue = (v: any) => v == null || v === "";

/** Runs inside the DataSheet provider to keep the store consistent:
 *  1. Bridges the `omit` key (source of truth) to row-deletion status, so
 *     omitted rows render struck-through *in place* — matching data-sheet's
 *     deletion model, which keeps deleted rows in the array (identity indices)
 *     rather than reindexing. (A client-side hide filter was tried, but
 *     data-sheet's edit methods — `onSelectionEdited`, `clearSelection`,
 *     `fillValues` — apply edits by raw selection index without mapping through
 *     `filteredRowIndices`, so filtering rows out desynced cell edits.)
 *  2. Prunes phantom / no-op overlay edits (e.g. the empty→"" edit produced by
 *     focusing and blurring an empty cell), which otherwise show a green cell.
 *     Workaround for a data-sheet `onCellEdited` bug; safe to remove once the
 *     library normalizes empty↔null.
 */
function StoreSync(): null {
  const storeAPI = useStoreAPI();
  const data = useSelector((s: any) => s.data);
  const updatedData = useSelector((s: any) => s.updatedData);
  const columnSpec = useSelector((s: any) => s.columnSpec);
  const setColumnOrder = useSetAtom(columnOrderAtom);

  // Capture data-sheet's in-store column order (e.g. after a drag-reorder) back
  // into the atom, so the loader re-initializing the spec preserves it.
  useEffect(() => {
    const keys = columnSpec.map((c: any) => c.key);
    setColumnOrder((prev) => {
      if (
        prev != null &&
        prev.length === keys.length &&
        prev.every((k, i) => k === keys[i])
      ) {
        return prev;
      }
      return keys;
    });
  }, [columnSpec, setColumnOrder]);

  // Prune phantom / no-op overlay edits.
  useEffect(() => {
    const state = storeAPI.getState();
    const next = state.updatedData.slice();
    let changed = false;
    for (let i = 0; i < next.length; i++) {
      const row = next[i];
      if (row == null) continue;
      let pruned: any = null;
      for (const key of Object.keys(row)) {
        const val = row[key];
        const base = state.data[i]?.[key];
        if (val === base || (isEmptyValue(val) && isEmptyValue(base))) {
          pruned = pruned ?? { ...row };
          delete pruned[key];
        }
      }
      if (pruned != null) {
        changed = true;
        next[i] = Object.keys(pruned).length > 0 ? pruned : undefined;
      }
    }
    if (changed) storeAPI.setState({ updatedData: next });
  }, [updatedData, storeAPI]);

  // Mirror effective omit → row-deletion status (strikethrough).
  useEffect(() => {
    const { rowStatus } = storeAPI.getState();
    const next = [...rowStatus];
    let changed = false;
    const n = Math.max(data.length, updatedData.length);
    for (let i = 0; i < n; i++) {
      const omitted = toBoolean(updatedData[i]?.omit ?? data[i]?.omit) === true;
      const marked = next[i] === TableElementStatus.DELETED;
      if (omitted && !marked) {
        next[i] = TableElementStatus.DELETED;
        changed = true;
      } else if (!omitted && marked) {
        next[i] = undefined;
        changed = true;
      }
    }
    if (changed) storeAPI.setState({ rowStatus: next });
  }, [data, updatedData, storeAPI]);

  return null;
}

/** Bar of active group / sort / filter state, shown above the table. Each is a
 * removable tag that clears the corresponding view-state atom. The default
 * "hide omitted" filter is not shown (it has its own toolbar toggle). */
function FilterStatusBar(): ReactNode {
  const [filters, setFilters] = useAtom(filtersAtom);
  const [sort, setSort] = useAtom(sortAtom);
  const [group, setGroup] = useAtom(groupAtom);

  const filterTags = Object.values(filters).filter(
    (f) => f.is_valid() && f.column_name !== "omit",
  );

  const removeFilter = (key: string) =>
    setFilters((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const clearAll = () => {
    setFilters(defaultFilters());
    setSort(null);
    setGroup(undefined);
  };

  if (group == null && sort == null && filterTags.length === 0) return null;

  return h("div.ingest-filter-bar", [
    h.if(group != null)(
      Tag,
      {
        icon: "group-objects",
        intent: "primary",
        minimal: true,
        onRemove: () => setGroup(undefined),
      },
      `Grouped: ${group}`,
    ),
    h.if(sort != null)(
      Tag,
      {
        icon: sort?.ascending ? "sort-asc" : "sort-desc",
        intent: "primary",
        minimal: true,
        onRemove: () => setSort(null),
      },
      sort?.key,
    ),
    ...filterTags.map((f) =>
      h(
        Tag,
        {
          key: f.column_name,
          icon: "filter",
          intent: "warning",
          minimal: true,
          onRemove: () => removeFilter(f.column_name),
        },
        `${f.column_name} ${OPERATOR_LABELS[f.operator ?? ""] ?? f.operator} ${f.value}`,
      ),
    ),
    h(
      Button,
      { minimal: true, small: true, icon: "cross", onClick: clearAll },
      "Clear all",
    ),
  ]);
}

/** Toggle between click-to-focus (default) and auto-focus cell editing. */
function EditorFocusToggle(): ReactNode {
  const [autoFocus, setAutoFocus] = useAtom(autoFocusEditorAtom);
  return h(Switch, {
    checked: autoFocus,
    label: "Auto-focus editor",
    inline: true,
    className: "editor-focus-toggle",
    onChange: (e) => setAutoFocus(e.currentTarget.checked),
  });
}

function StatusBar({
  total,
  loading,
  loaded,
}: {
  total: number | null;
  loading: boolean;
  loaded: number;
}): ReactNode {
  const count =
    total != null ? `${loaded} / ${total} rows` : `${loaded} rows`;
  return h("div.ingest-status-bar", [
    h.if(loading)(Spinner, { size: 14 }),
    h("span.row-count", count),
  ]);
}
