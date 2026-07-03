import { Button, OverlayToaster, Spinner, Tag } from "@blueprintjs/core";
import { RegionCardinality } from "@blueprintjs/table";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { useAtom, useAtomValue, useStore } from "jotai";
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
  defaultFilters,
  filtersAtom,
  groupAtom,
  hiddenColumnsAtom,
  showOmittedAtom,
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

/** Reorder a column spec: pin `source_layer` first, and ensure `b_interval`
 * precedes `t_interval`. Other columns keep their natural order. */
function orderColumns<T extends { key: string }>(cols: T[]): T[] {
  const out = [...cols];
  const pinFirst = (key: string) => {
    const i = out.findIndex((c) => c.key === key);
    if (i > 0) out.unshift(out.splice(i, 1)[0]);
  };
  pinFirst("source_layer");

  const ib = out.findIndex((c) => c.key === "b_interval");
  const it = out.findIndex((c) => c.key === "t_interval");
  if (ib >= 0 && it >= 0 && it < ib) {
    const [t] = out.splice(it, 1);
    out.splice(out.findIndex((c) => c.key === "b_interval") + 1, 0, t);
  }
  return out;
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
  const { data, total, loading, loadMore, reload } = useIngestData(url);

  const actions = useMemo(
    () => makeIngestActions({ url, store, reload, toaster }),
    [url, store, reload, toaster],
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
    return orderColumns(normalized);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnKeys, hiddenKey, overrides]);

  return h(DataSheet, {
    data,
    columnSpec,
    editable: true,
    actions,
    columnHeaderCellRenderer,
    enableColumnReordering: false,
    dataSheetActions: h("div.ingest-top", [
      h(ColumnControls),
      h("div.ingest-toolbar", [
        h(FilterStatusBar),
        h(StatusBar, { total, loading, loaded: data.length }),
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
 *     omitted rows render struck-through.
 *  2. Prunes phantom / no-op overlay edits (e.g. the empty→"" edit produced by
 *     focusing and blurring an empty cell), which otherwise show a green cell.
 *     Workaround for a data-sheet `onCellEdited` bug; safe to remove once the
 *     library normalizes empty↔null.
 */
function StoreSync(): null {
  const storeAPI = useStoreAPI();
  const data = useSelector((s: any) => s.data);
  const updatedData = useSelector((s: any) => s.updatedData);
  const showOmitted = useAtomValue(showOmittedAtom);

  // Hide/show omitted rows on the fly. In hide mode, a client-side filter keyed
  // on the effective `omit` value removes omitted rows (including ones omitted
  // this session, which the server hasn't filtered yet). Re-applied on data /
  // edit changes so newly-omitted rows drop out immediately.
  useEffect(() => {
    const api = storeAPI.getState();
    if (showOmitted) {
      api.removeFilter("hide-omitted");
    } else {
      api.setFilter(
        "hide-omitted",
        {
          id: "hide-omitted",
          name: "Omitted",
          predicate: (row: any) => toBoolean(row?.omit) !== true,
        },
        null,
      );
    }
  }, [showOmitted, data, updatedData, storeAPI]);

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
