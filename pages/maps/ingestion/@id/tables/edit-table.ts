import {
  Button,
  ButtonGroup,
  Icon,
  Menu,
  MenuItem,
  OverlayToaster,
  PopoverNext,
  Spinner,
  Switch,
  Tag,
} from "@blueprintjs/core";
import { RegionCardinality } from "@blueprintjs/table";
import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAtom, useAtomValue, useSetAtom, useStore } from "jotai";
import {
  DataSheet,
  generateColumnSpec,
  getSelectionCardinality,
  runActionWrapper,
  TableAction,
  useSelector,
  useStoreAPI,
  type ColumnSpec,
} from "@macrostrat/data-sheet";
import { createAppToaster } from "@macrostrat/ui-components";
import { FeatureType } from "./defs";
import { applyOps, diffToOps, opsAtom } from "./pending-ops";
import {
  autoFocusEditorAtom,
  columnOrderAtom,
  defaultFilters,
  filtersAtom,
  groupAtom,
  hiddenColumnsAtom,
  saveProgressAtom,
  sortAtom,
  useIngestData,
  useResetIngestState,
  useTableStatePersistence,
} from "./state";
import { ProgressPopover } from "../components";
import { makeIngestActions, type IngestActions } from "./actions";
import { makeColumnHeaderRenderer, SYSTEM_COLUMN } from "./column-header";
import { ColumnControls } from "./column-controls";
import h from "../hyper";

/** Force the system column (`source_layer`) to the front, wherever it landed. */
function pinSystemColumn<T extends { key: string }>(cols: T[]): T[] {
  const i = cols.findIndex((c) => c.key === SYSTEM_COLUMN);
  if (i <= 0) return cols;
  const out = [...cols];
  out.unshift(out.splice(i, 1)[0]);
  return out;
}

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
  ingestProcessId,
  featureType,
  finalColumns,
  overrides = {},
}: EditTableProps) {
  useResetIngestState(url);
  useTableStatePersistence(ingestProcessId, featureType);
  const store = useStore();
  const toaster = useToasterInstance();
  const hiddenColumns = useAtomValue(hiddenColumnsAtom);
  const columnOrder = useAtomValue(columnOrderAtom);
  const autoFocusEditor = useAtomValue(autoFocusEditorAtom);
  const group = useAtomValue(groupAtom);
  const { data, total, loading, done, loadMore, reload } = useIngestData(url);

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
    const ordered =
      columnOrder != null
        ? orderByKeys(normalized, columnOrder)
        : orderByFinal(normalized, finalColumns);
    return pinSystemColumn(ordered);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnKeys, hiddenKey, orderKey, overrides, finalColumns]);

  return h("div.ingest-table-wrap", [
    h(
      DataSheet,
      {
        data,
        columnSpec,
        editable: true,
        // Only the hotkey-only clipboard actions go to the built-in toolbar
        // (they render nothing since `targets: []`); everything else is in our
        // own contextual toolbar below. `enableClipboard: false` avoids the
        // built-in clipboard actions duplicating hotkeys.
        actions: actions.clipboard,
        columnHeaderCellRenderer,
        enableColumnReordering: true,
        enableClipboard: false,
        autoFocusEditor,
        dataSheetActions: h("div.ingest-top", [
          h(IngestToolbar, { actions, toaster }),
          h(FilterStatusBar),
          h(SaveProgress),
        ]),
        onVisibleCellsChange: (visibleCells) => {
          if (visibleCells.rowIndexEnd > data.length - 20) {
            loadMore();
          }
        },
        selectionModes: [
          RegionCardinality.FULL_COLUMNS,
          RegionCardinality.FULL_ROWS,
        ],
      },
      h(StoreSync, { base: data, group }),
    ),
    h(StatusBar, { total, loading, done, loaded: data.length }),
  ]);
}

/** Runs inside the DataSheet provider and keeps the store in sync with the
 * page-side state:
 *  1. Captures data-sheet's in-store column order (after a drag-reorder) into
 *     `columnOrderAtom`, so the loader re-initializing the spec preserves it.
 *  2. Derives the edit overlay + row status from the pending-ops stack and the
 *     loaded rows (`applyOps`), pushing them into the store.
 *  3. Captures inline cell edits (which data-sheet writes straight to
 *     `updatedData`) back into the ops stack, keeping the stack authoritative.
 *     Once the library exposes an op-based edit API this step goes away.
 */
function StoreSync({
  base,
  group,
}: {
  base: any[];
  group: string | undefined;
}): null {
  const storeAPI = useStoreAPI();
  const [ops, setOps] = useAtom(opsAtom);
  const overlay = useSelector((s: any) => s.updatedData);
  const columnSpec = useSelector((s: any) => s.columnSpec);
  const setColumnOrder = useSetAtom(columnOrderAtom);
  const derivedRef = useRef<any[]>([]);

  // (1) Capture column reorder.
  useEffect(() => {
    const keys = columnSpec.map((c: any) => c.key);
    setColumnOrder((prev) =>
      prev != null &&
      prev.length === keys.length &&
      prev.every((k, i) => k === keys[i])
        ? prev
        : keys,
    );
  }, [columnSpec, setColumnOrder]);

  // (2) Derive overlay + row status from ops + loaded rows.
  useEffect(() => {
    const { updatedData, rowStatus } = applyOps(base, ops);
    derivedRef.current = updatedData;
    storeAPI.setState({ updatedData, rowStatus });
  }, [ops, base, storeAPI]);

  // (3) Capture inline edits: when the store overlay diverges from what we
  // derived, translate the delta into ops (which re-derives, converging). If
  // the divergence yields no ops (a phantom empty↔null edit), re-assert the
  // derived overlay to clear the stray value.
  useEffect(() => {
    if (overlay === derivedRef.current) return;
    const newOps = diffToOps(overlay, derivedRef.current, base, group);
    if (newOps.length > 0) {
      setOps((prev) => [...prev, ...newOps]);
    } else {
      storeAPI.setState({ updatedData: derivedRef.current });
    }
  }, [overlay, base, group, setOps, storeAPI]);

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

/** Single contextual toolbar: controls for the current selection mode on the
 * left, always-available Save / Reset on the right. Replaces the separate
 * per-mode strips so the top of the UI stays stable as selection changes. */
function IngestToolbar({
  actions,
  toaster,
}: {
  actions: IngestActions;
  toaster: OverlayToaster | null;
}): ReactNode {
  const storeAPI = useStoreAPI();
  const selection = useSelector((s: any) => s.selection);
  const cardinality = getSelectionCardinality(selection);
  const run = useCallback(
    (action: TableAction) =>
      runActionWrapper(action, storeAPI.getState(), storeAPI.setState, toaster),
    [storeAPI, toaster],
  );

  let context: ReactNode;
  switch (cardinality) {
    case RegionCardinality.FULL_COLUMNS:
      context = h(ColumnControls);
      break;
    case RegionCardinality.FULL_ROWS:
      context = h(ButtonGroup, { minimal: true }, [
        h(ActionBtn, { action: actions.omit, run }),
        h(ActionBtn, { action: actions.restore, run }),
      ]);
      break;
    case RegionCardinality.CELLS:
      context = h(EditorFocusToggle);
      break;
    default:
      // No selection / whole table.
      context = h(ButtonGroup, { minimal: true }, [
        h(ActionBtn, { action: actions.toggleOmitted, run }),
        h(ActionBtn, { action: actions.showHidden, run }),
      ]);
      break;
  }

  return h("div.ingest-action-bar", [
    h("div.context-controls", context),
    h("div.spacer"),
    h(PendingOpsControl),
    h(ButtonGroup, { minimal: true }, [
      h(ActionBtn, { action: actions.save, run }),
      h(ActionBtn, { action: actions.reset, run }),
    ]),
  ]);
}

/** Shows the count of pending operations; the popover lists them grouped by the
 * action that produced them, with a ✕ to revert a whole batch. */
function PendingOpsControl(): ReactNode {
  const [ops, setOps] = useAtom(opsAtom);
  if (ops.length === 0) return null;

  // Group ops by the batch that created them (one edit / paste / omit action).
  const batches: { id: string; label: string; count: number }[] = [];
  const seen = new Map<string, number>();
  for (const op of ops) {
    const idx = seen.get(op.batchId);
    if (idx == null) {
      seen.set(op.batchId, batches.length);
      batches.push({ id: op.batchId, label: op.label, count: 1 });
    } else {
      batches[idx].count += 1;
    }
  }

  const removeBatch = (batchId: string) =>
    setOps((prev) => prev.filter((op) => op.batchId !== batchId));

  return h(
    PopoverNext,
    {
      placement: "bottom-end",
      content: h(
        Menu,
        {},
        batches.map((b) =>
          h(MenuItem, {
            key: b.id,
            text: b.count > 1 ? `${b.label} (${b.count})` : b.label,
            shouldDismissPopover: false,
            labelElement: h(Button, {
              icon: "cross",
              minimal: true,
              small: true,
              onClick: (e: any) => {
                e.stopPropagation();
                removeBatch(b.id);
              },
            }),
          }),
        ),
      ),
    },
    h(
      Button,
      { minimal: true, small: true, icon: "history", rightIcon: "caret-down" },
      `${batches.length} pending`,
    ),
  );
}

/** A toolbar button for a TableAction, with reactive disabled state. */
function ActionBtn({
  action,
  run,
}: {
  action: TableAction;
  run: (a: TableAction) => void;
}): ReactNode {
  const disabled = useSelector((s: any) =>
    typeof action.disabled === "function"
      ? action.disabled(s)
      : Boolean(action.disabled),
  );
  return h(
    Button,
    {
      small: true,
      icon: action.icon,
      intent: action.intent,
      disabled,
      onClick: () => run(action),
    },
    action.name,
  );
}

/** Progress bar shown while a batch save is in flight. */
function SaveProgress(): ReactNode {
  const progress = useAtomValue(saveProgressAtom);
  if (progress == null) return null;
  return h(ProgressPopover, {
    progressBarProps: { intent: "success" },
    value: progress.value,
    text: progress.text,
  });
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
  done,
  loaded,
}: {
  total: number | null;
  loading: boolean;
  done: boolean;
  loaded: number;
}): ReactNode {
  const fullyLoaded = done || (total != null && loaded >= total);
  const count = total != null ? `${loaded} / ${total} rows` : `${loaded} rows`;

  let indicator: ReactNode;
  if (loading) {
    indicator = h(Spinner, { size: 12 });
  } else if (fullyLoaded) {
    indicator = h(Icon, { icon: "small-tick", size: 12, className: "load-done" });
  } else {
    indicator = h(Icon, { icon: "more", size: 12, className: "load-more" });
  }

  return h("div.ingest-status-bar", [h("span.row-count", count), indicator]);
}
