import {
  Button,
  Icon,
  Menu,
  MenuItem,
  OverlayToaster,
  PopoverNext,
  Switch,
  Tag,
} from "@blueprintjs/core";
import { RegionCardinality } from "@blueprintjs/table";
import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useAtom, useAtomValue, useSetAtom, useStore } from "jotai";
import {
  DataSheet,
  generateColumnSpec,
  useSelector,
  useStoreAPI,
  type ColumnSpec,
  type EditEvent,
} from "@macrostrat/data-sheet";
import { createAppToaster } from "@macrostrat/ui-components";
import { FeatureType } from "./defs";
import {
  appendOps,
  applyOps,
  makeCellOp,
  nextBatch,
  OMITTED_STATUS,
  opsAtom,
} from "./pending-ops";
import type {
  RowHeaderRenderContext,
  RowStatusStyles,
} from "@macrostrat/data-sheet";
import { Filter, rowPassesFilters } from "../utils";
import {
  activeServerFiltersAtom,
  autoFocusEditorAtom,
  columnOrderAtom,
  groupAtom,
  hiddenColumnsAtom,
  libraryFilterToServer,
  makeIngestProvider,
  omitFilter,
  PAGE_SIZE,
  reloadNonceAtom,
  saveProgressAtom,
  showOmittedAtom,
  SYSTEM_COLUMN,
  useResetIngestState,
  useTableStatePersistence,
} from "./state";
import { ProgressPopover } from "../components";
import { makeIngestActions } from "./actions";
import h from "../hyper";

const isEmptyValue = (v: any) => v == null || v === "";

/** Presentation for omitted rows — dimmed + struck through, but *grey* (no
 * danger intent), so an omitted row reads as "excluded from export", distinct
 * from a staged delete. */
const ROW_STATUS_STYLES: RowStatusStyles = {
  [OMITTED_STATUS]: {
    cellStyle: { opacity: 0.55, textDecoration: "line-through" },
    headerStyle: { opacity: 0.7 },
  },
};

/** Row-header content: mark omitted rows with an eye-off icon beside the row
 * number; other rows keep the default label. */
function renderIngestRowHeader(ctx: RowHeaderRenderContext): ReactNode {
  if (ctx.status !== OMITTED_STATUS) return null;
  return h(
    "span",
    { style: { display: "inline-flex", alignItems: "center", gap: "3px" } },
    [ctx.defaultLabel, h(Icon, { icon: "eye-off", size: 10 })]
  );
}

/** Force the system column (`source_layer`) to the front, wherever it landed. */
function pinSystemColumn<T extends { key: string }>(cols: T[]): T[] {
  const i = cols.findIndex((c) => c.key === SYSTEM_COLUMN);
  if (i <= 0) return cols;
  const out = [...cols];
  out.unshift(out.splice(i, 1)[0]);
  return out;
}

/** Columns present in the data but never shown directly (identity / control).
 * `omit` is controlled via the Omit/Restore actions (row-deletion mechanism). */
const INTERNAL_COLUMNS = ["_pkid", "source_id", "omit"];

/** CSS that tints "final" (harmonized) column headers, matched on the library's
 * `data-column-key` attribute (so no bespoke header-styling prop is needed).
 * Only simple keys are emitted, guarding the attribute selector. */
function buildFinalColumnCSS(finalColumns: string[]): string {
  const keys = finalColumns.filter((k) => /^[A-Za-z0-9_-]+$/.test(k));
  if (keys.length === 0) return "";
  const header = keys
    .map((k) => `.bp6-table-header:has([data-column-key="${k}"])`)
    .join(",");
  return `${header}{background-color:rgba(45,114,210,0.12)}`;
}

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
  finalColumns: string[]
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
  order: string[]
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
  /** Identity of the ingest process — its `source_id` primary key. */
  sourceId: number;
  featureType: FeatureType;
  /** Columns considered "final" / harmonized (starred in the header). */
  finalColumns: string[];
  /** Per-column ColumnSpec overrides (names, read-only flags, editors). */
  overrides?: Record<string, Partial<ColumnSpec> | string>;
}

export function TableInterface({
  url,
  sourceId,
  featureType,
  finalColumns,
  overrides = {},
}: EditTableProps) {
  useResetIngestState(url);
  useTableStatePersistence(sourceId, featureType);
  const store = useStore();
  const toaster = useToasterInstance();
  const hiddenColumns = useAtomValue(hiddenColumnsAtom);
  const columnOrder = useAtomValue(columnOrderAtom);
  const autoFocusEditor = useAtomValue(autoFocusEditorAtom);
  const group = useAtomValue(groupAtom);
  const showOmitted = useAtomValue(showOmittedAtom);
  const reloadNonce = useAtomValue(reloadNonceAtom);
  const setReloadNonce = useSetAtom(reloadNonceAtom);

  // The library owns windowed loading via a `fetchData` provider (scroll +
  // progress) and the sort/filter state; the provider reads group + the omit
  // view-toggle from the store at fetch time. A change to those page-side bits
  // (or a post-save reload) bumps `refreshToken`; the library re-fetches on its
  // own sort/filter changes.
  const provider = useMemo(() => makeIngestProvider(url, store), [url, store]);
  const reload = useCallback(
    () => setReloadNonce((n) => n + 1),
    [setReloadNonce]
  );
  const refreshToken = useMemo(
    () => [group ?? "", showOmitted ? "1" : "0", reloadNonce].join("|"),
    [group, showOmitted, reloadNonce]
  );

  // The edit overlay is a pure derivation of the pending-ops stack over the
  // loaded rows. Since the library owns the rows, we derive it *inside* the
  // sheet via `deriveOverlay(rows)` (re-run when the rows load/change or `ops`
  // change) rather than passing a controlled `updatedData`/`rowStatus`.
  const ops = useAtomValue(opsAtom);
  const setOps = useSetAtom(opsAtom);
  const deriveOverlay = useMemo(
    () => (rows: any[]) => applyOps(rows, ops),
    [ops]
  );

  // Inline edits arrive as structured `onEdit` events carrying the base `row`
  // (v4.1). Each real cell edit becomes a `setCell` op; retyping the base value
  // drops the row+column's single-cell ops (revert).
  const handleEdit = useCallback(
    (event: EditEvent) => {
      if (event.type !== "setCells") return;
      setOps((prev) => {
        let next = prev;
        const additions = [];
        const batchId = nextBatch();
        for (const { row, column, value } of event.cells) {
          if (row == null) continue;
          const baseValue = row[column];
          const isNoop =
            value === baseValue ||
            (isEmptyValue(value) && isEmptyValue(baseValue));
          if (isNoop) {
            // Revert: drop this row+column's single-cell ops (leave column-copy
            // rules, which carry a `source`, intact).
            next = next.filter(
              (op) =>
                op.source != null ||
                op.column !== column ||
                !rowPassesFilters(row, Object.values(op.match))
            );
          } else {
            additions.push(
              makeCellOp(row, group, column, value, undefined, batchId)
            );
          }
        }
        // `appendOps` supersedes any pending op writing the same cells, so
        // re-editing a cell replaces its op instead of queueing a second one.
        return appendOps(next, additions);
      });
    },
    [group, setOps]
  );

  const actions = useMemo(
    () => makeIngestActions({ url, store, reload, toaster }),
    [url, store, reload, toaster]
  );

  // Column spec derived from the loaded rows (via the library's function-form
  // `columnSpec` — no separate schema fetch). Sort/filter are enabled (the
  // library's column-header menus drive them; the provider translates them to
  // the server query). The system column is pinned (non-reorderable); hidden +
  // internal columns are dropped. The library re-derives when this callback's
  // identity changes (hidden columns / order), reusing the already-loaded rows.
  const columnSpec = useCallback(
    (rows: any[]): ColumnSpec[] => {
      const spec = generateColumnSpec(rows, {
        overrides,
        omitColumns: [...INTERNAL_COLUMNS, ...hiddenColumns],
      });
      const normalized = spec.map((col) => ({
        ...col,
        sortable: true,
        filterable: true,
        reorderable: col.key !== SYSTEM_COLUMN,
        valueRenderer: safeRenderer(col.valueRenderer),
      }));
      // A saved (user) order takes precedence; otherwise final columns lead.
      const ordered =
        columnOrder != null
          ? orderByKeys(normalized, columnOrder)
          : orderByFinal(normalized, finalColumns);
      return pinSystemColumn(ordered);
    },
    [overrides, hiddenColumns, columnOrder, finalColumns]
  );

  // Tint "final" (harmonized) columns by targeting the header's
  // `data-column-key` (set by the library) — no bespoke styling prop needed.
  const finalColumnCSS = useMemo(
    () => buildFinalColumnCSS(finalColumns),
    [finalColumns]
  );

  return h("div.ingest-table-wrap", [
    h.if(finalColumnCSS !== "")("style", finalColumnCSS),
    h(
      DataSheet,
      {
        provider,
        columnSpec,
        editable: true,
        pageSize: PAGE_SIZE,
        // Overlay derived inside the sheet from the pending-ops stack;
        // `refreshToken` re-fetches on a page-side view change or post-save.
        deriveOverlay,
        refreshToken,
        onEdit: handleEdit,
        // All page actions (save/reset/omit/restore/group/hide + hotkey-only
        // clipboard) run through the library's own toolbar + column-header
        // menus. `enableClipboard: false` avoids duplicate clipboard hotkeys.
        actions,
        enableColumnReordering: true,
        enableClipboard: false,
        autoFocusEditor,
        // View-state controls (group tag, omit/hidden toggles, editor focus,
        // pending-ops, save progress) live in the bottom status bar.
        statusBar: h(IngestStatusBar),
        // Omitted rows are a first-class row status (grey/struck, eye-off in
        // the gutter) — distinct from a staged delete.
        rowStatusStyles: ROW_STATUS_STYLES,
        rowHeaderRenderer: renderIngestRowHeader,
        // CELLS must be present for editing to be enabled: data-sheet's
        // `resolveInteractionOptions` forces `enableEditing = false` when the
        // table's `selectionModes` omit CELLS (even with `editable: true`). We
        // also want column/row selection (group-by, omit, etc.), so include all
        // three.
        selectionModes: [
          RegionCardinality.CELLS,
          RegionCardinality.FULL_COLUMNS,
          RegionCardinality.FULL_ROWS,
        ],
      },
      // Sync helpers run inside the DataSheet provider: column reorder → page
      // state; active library filters → the server-filter mirror (copy scope).
      [
        h(StoreSync, { key: "store-sync" }),
        h(ViewStateSync, { key: "view-sync" }),
        h(FillCapture, { key: "fill-sync" }),
      ]
    ),
  ]);
}

/** Runs inside the DataSheet provider to capture the in-store column order
 * (after a drag-reorder) into `columnOrderAtom`, so the loader re-initializing
 * the spec preserves it. */
function StoreSync(): null {
  const columnSpec = useSelector((s: any) => s.columnSpec);
  const setColumnOrder = useSetAtom(columnOrderAtom);

  useEffect(() => {
    const keys = columnSpec.map((c: any) => c.key);
    setColumnOrder((prev) =>
      prev != null &&
      prev.length === keys.length &&
      prev.every((k, i) => k === keys[i])
        ? prev
        : keys
    );
  }, [columnSpec, setColumnOrder]);

  return null;
}

// Capture fill-handle drags so Save would otherwise miss them.
function FillCapture(): null {
  const storeAPI = useStoreAPI();

  useEffect(() => {
    const onMouseUp = () => {
      const state: any = storeAPI.getState();
      const base = state.fillValueBaseCell;
      if (base == null) return;
      // Clear the anchor so a later plain mouse-up can't re-capture this fill.
      storeAPI.setState({ fillValueBaseCell: null });

      const { selection, columnSpec, data, updatedData, filteredRowIndices } =
        state;
      const key = columnSpec?.[base.col]?.key;
      if (key == null) return;

      const toDataRow = (visibleRow: number) =>
        filteredRowIndices != null
          ? filteredRowIndices[visibleRow] ?? visibleRow
          : visibleRow;
      const baseRow = toDataRow(base.row);
      const value = updatedData[baseRow]?.[key] ?? data[baseRow]?.[key];

      const cells: { row: any; column: string; value: any }[] = [];
      const seen = new Set<number>();
      for (const region of selection ?? []) {
        const rows = region?.rows;
        if (rows == null) continue;
        for (let v = rows[0]; v <= rows[1]; v++) {
          const r = toDataRow(v);
          if (r === baseRow || seen.has(r)) continue;
          seen.add(r);
          if (data[r] != null) cells.push({ row: data[r], column: key, value });
        }
      }
      if (cells.length > 0) state.onEdit?.({ type: "setCells", cells });
    };
    window.addEventListener("mouseup", onMouseUp);
    return () => window.removeEventListener("mouseup", onMouseUp);
  }, [storeAPI]);

  return null;
}

/** Mirror the library's active column filters (owned by the data-sheet store)
 * into `activeServerFiltersAtom`, translated to the server operator vocabulary
 * and including the omit view-toggle — so the whole-column-copy action can
 * scope its server copy to the current filtered view. */
function ViewStateSync(): null {
  const activeFilters = useSelector((s: any) => s.activeFilters);
  const showOmitted = useAtomValue(showOmittedAtom);
  const setServerFilters = useSetAtom(activeServerFiltersAtom);

  useEffect(() => {
    const out: Filter[] = [];
    for (const entry of activeFilters?.values?.() ?? []) {
      const f = libraryFilterToServer(entry?.filter?.columnKey, entry?.state);
      if (f != null) out.push(f);
    }
    if (!showOmitted) out.push(omitFilter());
    setServerFilters(out);
  }, [activeFilters, showOmitted, setServerFilters]);

  return null;
}

/** The bottom status-bar content: active group tag + view toggles (show
 * omitted / show hidden / editor focus), the pending-ops control, and the
 * batch-save progress. Sort/filter tags are rendered by the library itself. */
function IngestStatusBar(): ReactNode {
  return h("div.ingest-view-state", [
    h(GroupTag, { key: "group" }),
    h(ShowOmittedToggle, { key: "omitted" }),
    h(ShowHiddenControl, { key: "hidden" }),
    h(EditorFocusToggle, { key: "focus" }),
    h(PendingOpsControl, { key: "pending" }),
    h(SaveProgress, { key: "progress" }),
  ]);
}

/** The active group-by column, as a removable tag. */
function GroupTag(): ReactNode {
  const [group, setGroup] = useAtom(groupAtom);
  if (group == null) return null;
  return h(
    Tag,
    {
      icon: "group-objects",
      intent: "primary",
      minimal: true,
      onRemove: () => setGroup(undefined),
    },
    `Grouped: ${group}`
  );
}

/** Toggle whether omitted rows are shown (drives the provider's omit filter). */
function ShowOmittedToggle(): ReactNode {
  const [showOmitted, setShowOmitted] = useAtom(showOmittedAtom);
  return h(Switch, {
    checked: showOmitted,
    label: "Show omitted",
    inline: true,
    onChange: (e) => setShowOmitted(e.currentTarget.checked),
  });
}

/** Button to reveal hidden columns; only shown when some are hidden. */
function ShowHiddenControl(): ReactNode {
  const [hidden, setHidden] = useAtom(hiddenColumnsAtom);
  if (hidden.length === 0) return null;
  return h(
    Button,
    {
      minimal: true,
      small: true,
      icon: "eye-open",
      onClick: () => setHidden([]),
    },
    `Show ${hidden.length} hidden column${hidden.length === 1 ? "" : "s"}`
  );
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
      placement: "top-end",
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
          })
        )
      ),
    },
    h(
      Button,
      { minimal: true, small: true, icon: "history", rightIcon: "caret-down" },
      `${batches.length} pending`
    )
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
