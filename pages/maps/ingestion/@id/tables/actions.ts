/**
 * Selection-aware table actions for the ingestion data-sheet, expressed as
 * `@macrostrat/data-sheet` `TableAction`s and rendered by the library's own
 * toolbar + column-header menus (no bespoke page toolbar).
 *
 * All mutations go through the pending-ops stack (`opsAtom`): edits, omit /
 * restore, and whole-column copy append ops; Save flushes the stack to the API;
 * Reset clears it. Sort / filter are owned by the data-sheet store (the
 * provider translates them to the server query); group-by / hide / the view
 * toggles remain page-side atoms.
 */
import { RegionCardinality } from "@blueprintjs/table";
import {
  copyAction,
  cutAction,
  getSelectedColumnKeys,
  getSelectedRowIndices,
  pasteAction,
  serializeSelectionToTSV,
  TableAction,
} from "@macrostrat/data-sheet";
import type { OverlayToaster } from "@blueprintjs/core";
import type { createStore } from "jotai";
import { toBoolean } from "../components";
import {
  activeServerFiltersAtom,
  groupAtom,
  hiddenColumnsAtom,
  saveProgressAtom,
  SYSTEM_COLUMN,
} from "./state";
import {
  makeCellOp,
  makeColumnCopyOp,
  nextBatch,
  opsAtom,
  saveOps,
  type PendingOp,
} from "./pending-ops";

/** A row's effective omit state = its overlaid `omit` (derived from the ops
 * stack), falling back to the loaded value. */
function isOmitted(state: any, i: number): boolean {
  return toBoolean(state.updatedData[i]?.omit ?? state.data[i]?.omit) === true;
}

type JotaiStore = ReturnType<typeof createStore>;

/** In-app clipboard buffer, populated by the in-table copy / cut actions. Used
 * as a fallback when the browser blocks `navigator.clipboard.readText()` —
 * Chrome throws "Read permission denied" when the `clipboard-read` permission
 * isn't granted (writing during copy is allowed on a user gesture, so a copy
 * succeeds but the matching paste fails). Buffering the copied text here lets a
 * copy → paste *within* the sheet work regardless of that permission. Module
 * scope (not an atom) so it survives the `makeIngestActions` `useMemo`. */
const inAppClipboard: { text: string | null } = { text: null };

/** Parse tab-separated clipboard text into a row-major grid (mirrors the
 * data-sheet library's own `parseTSV`). */
function parseTSV(text: string): string[][] {
  return text
    .trim()
    .split("\n")
    .map((row) => row.split("\t"));
}

/** Reimplements the data-sheet library's Excel-style paste tiling (its
 * `buildPasteEdits` is not exported) so we can paste from our own text buffer
 * without calling `navigator.clipboard.readText()`. Single-cell selections
 * expand from the anchor; a selection matching or larger than the data tiles to
 * fill it; a smaller selection truncates the data. Clips at the table edges. */
function buildPasteEdits(
  ctx: any,
  text: string,
): { rowIndex: number; column: string; value: string }[] {
  const parsed = parseTSV(text);
  if (parsed.length === 0) return [];

  const cardinality = ctx.selectionCardinality ?? RegionCardinality.FULL_TABLE;
  const numDataRows = Math.max(ctx.data.length, ctx.updatedData.length);
  const numCols = ctx.columnSpec.length;
  const rowIndices = ctx.getSelectedRowIndices();
  const columnKeys = ctx.getSelectedColumnKeys();
  const colIdxOf = (key: string) =>
    ctx.columnSpec.findIndex((c: any) => c.key === key);

  let startRow: number;
  let startColIdx: number;
  let targetRowCount: number;
  let targetColCount: number;
  switch (cardinality) {
    case RegionCardinality.CELLS:
      startRow = rowIndices[0] ?? 0;
      startColIdx = columnKeys.length > 0 ? colIdxOf(columnKeys[0]) : 0;
      targetRowCount = rowIndices.length;
      targetColCount = columnKeys.length;
      break;
    case RegionCardinality.FULL_ROWS:
      startRow = rowIndices[0] ?? 0;
      startColIdx = 0;
      targetRowCount = rowIndices.length;
      targetColCount = numCols;
      break;
    case RegionCardinality.FULL_COLUMNS:
      startRow = 0;
      startColIdx = columnKeys.length > 0 ? colIdxOf(columnKeys[0]) : 0;
      targetRowCount = numDataRows;
      targetColCount = columnKeys.length;
      break;
    default:
      startRow = 0;
      startColIdx = 0;
      targetRowCount = numDataRows;
      targetColCount = numCols;
  }
  if (startColIdx < 0) startColIdx = 0;

  const dataRows = parsed.length;
  const dataCols = Math.max(...parsed.map((r) => r.length));
  const isSingleCell = targetRowCount === 1 && targetColCount === 1;

  let pasteRows: number;
  let pasteCols: number;
  if (isSingleCell) {
    // Expand from the anchor to fit the data, clipped at the table edge.
    pasteRows = Math.min(dataRows, numDataRows - startRow);
    pasteCols = Math.min(dataCols, numCols - startColIdx);
  } else if (dataRows > targetRowCount || dataCols > targetColCount) {
    // Data larger than the selection: clip to the data extent.
    pasteRows = Math.min(dataRows, targetRowCount);
    pasteCols = Math.min(dataCols, targetColCount);
  } else {
    // Exact or smaller: fill the selection (tiling via the modulo below).
    pasteRows = targetRowCount;
    pasteCols = targetColCount;
  }

  const edits: { rowIndex: number; column: string; value: string }[] = [];
  for (let r = 0; r < pasteRows; r++) {
    const dataRow = startRow + r;
    if (dataRow >= numDataRows) break;
    const row = parsed[dataRows > 0 ? r % dataRows : 0];
    if (row == null) continue;
    for (let c = 0; c < pasteCols; c++) {
      const colIdx = startColIdx + c;
      if (colIdx >= numCols) break;
      edits.push({
        rowIndex: dataRow,
        column: ctx.columnSpec[colIdx].key,
        value: row[dataCols > 0 ? c % dataCols : 0] ?? "",
      });
    }
  }
  return edits;
}

const ALL_CARDINALITIES: TableAction["targets"] = [
  "none",
  RegionCardinality.FULL_TABLE,
  RegionCardinality.FULL_ROWS,
  RegionCardinality.FULL_COLUMNS,
  RegionCardinality.CELLS,
];

/** True if the (derived) overlay holds at least one pending change. Tolerates a
 * missing overlay — the library probes `disabled` with a bare `{}` state when
 * deciding whether the toolbar has any displayable actions. */
function hasPendingChanges(updatedData: any[] | undefined): boolean {
  return (updatedData ?? []).some(
    (row) => row != null && Object.keys(row).length > 0,
  );
}

export interface IngestActionDeps {
  url: string;
  store: JotaiStore;
  reload: () => void;
  toaster?: OverlayToaster | null;
}

/** The full action set passed to `DataSheet`'s `actions` prop. Save / Reset are
 * global (they sit on the toolbar's right); omit / restore are row-scoped;
 * group-by / hide are column-scoped (and so appear in the column-header menu);
 * the clipboard actions are hotkey-only (`targets: []`). */
export function makeIngestActions({
  url,
  store,
  reload,
  toaster,
}: IngestActionDeps): TableAction[] {
  const notify = (message: string, intent: "success" | "danger" | "primary") =>
    toaster?.show({ message, intent });

  const appendOps = (ops: PendingOp[]) =>
    store.set(opsAtom, [...store.get(opsAtom), ...ops]);

  const saveAction: TableAction = {
    id: "save-changes",
    name: "Save",
    icon: "floppy-disk",
    intent: "success",
    requiresEditable: true,
    targets: ALL_CARDINALITIES,
    disabled: (ctx) => !hasPendingChanges(ctx.updatedData),
    async run() {
      const ops = store.get(opsAtom);
      if (ops.length === 0) return;
      try {
        const n = await saveOps(url, ops, (done, total) => {
          store.set(
            saveProgressAtom,
            total > 1
              ? { value: done / total, text: `Saving ${done} / ${total}…` }
              : null,
          );
        });
        store.set(saveProgressAtom, null);
        store.set(opsAtom, []);
        reload();
        notify(`Saved ${n} change${n === 1 ? "" : "s"}`, "success");
      } catch (err) {
        store.set(saveProgressAtom, null);
        console.error(err);
        notify("Failed to save", "danger");
      }
    },
  };

  const resetAction: TableAction = {
    id: "reset-changes",
    name: "Reset",
    icon: "reset",
    intent: "warning",
    requiresEditable: true,
    targets: ALL_CARDINALITIES,
    disabled: (ctx) => !hasPendingChanges(ctx.updatedData),
    run() {
      store.set(opsAtom, []);
    },
  };

  // Omit / restore append `setCell` ops on the `omit` column (revertible; the
  // struck-through visual is derived from the resulting overlay). Grouped rows
  // fan out over the whole group via the op's identity match.
  const setOmit = (ctx: any, omit: boolean) => {
    const group = store.get(groupAtom);
    const rows = ctx
      .getSelectedRowIndices()
      .map((i: number) => ctx.data[i])
      .filter(Boolean);
    if (rows.length === 0) return;
    const batch = nextBatch();
    appendOps(
      rows.map((r: any) =>
        makeCellOp(
          r,
          group,
          "omit",
          omit,
          omit ? "Omit rows" : "Restore rows",
          batch,
        ),
      ),
    );
    // Deselect (note: data-sheet's `clearSelection` clears cell *values*, not
    // the selection).
    ctx.setState({ selection: [], focusedCell: null, topLeftCell: null });
  };

  const omitRowsAction: TableAction = {
    id: "omit-rows",
    name: "Omit",
    icon: "eye-off",
    requiresEditable: true,
    targets: [RegionCardinality.FULL_ROWS],
    disabled: (s: any) => {
      const rows = getSelectedRowIndices(s.selection ?? []);
      return rows.length === 0 || rows.every((r) => isOmitted(s, r));
    },
    run: (ctx) => setOmit(ctx, true),
  };

  const restoreRowsAction: TableAction = {
    id: "restore-rows",
    name: "Restore",
    icon: "eye-open",
    requiresEditable: true,
    targets: [RegionCardinality.FULL_ROWS],
    // Only shown when the selection actually holds omitted rows (`appliesTo`
    // hides it entirely rather than merely greying it out).
    appliesTo: (ctx) =>
      ctx.getSelectedRowIndices().some((r: number) => isOmitted(ctx, r)),
    run: (ctx) => setOmit(ctx, false),
  };

  // Column-scoped: group-by (toggle) and hide. Being `FULL_COLUMNS` actions,
  // they show in the column-header dropdown menu (and the toolbar when a column
  // is selected), alongside the library's built-in sort/filter.
  const groupByAction: TableAction = {
    id: "group-by",
    name: "Group by",
    icon: "group-objects",
    requiresEditable: false,
    targets: [RegionCardinality.FULL_COLUMNS],
    appliesTo: (ctx) => ctx.columnKey != null,
    run(ctx) {
      const key = ctx.columnKey;
      if (key == null) return;
      const current = store.get(groupAtom);
      store.set(groupAtom, current === key ? undefined : key);
    },
  };

  const hideColumnAction: TableAction = {
    id: "hide-column",
    name: "Hide",
    icon: "eye-off",
    requiresEditable: false,
    targets: [RegionCardinality.FULL_COLUMNS],
    // `disabled` is called with the raw store state, so read state fields via
    // the library helper (not context methods, which only exist in `run`).
    disabled: (s: any) =>
      getSelectedColumnKeys(s.selection ?? [], s.columnSpec ?? []).filter(
        (k: string) => k !== SYSTEM_COLUMN,
      ).length === 0,
    run(ctx) {
      const keys = ctx
        .getSelectedColumnKeys()
        .filter((k: string) => k !== SYSTEM_COLUMN);
      if (keys.length === 0) return;
      store.set(
        hiddenColumnsAtom,
        Array.from(new Set([...store.get(hiddenColumnsAtom), ...keys])),
      );
      ctx.setState({ selection: [], focusedCell: null, topLeftCell: null });
    },
  };

  // Copy / cut: serialize the selection to TSV, mirror it to the system
  // clipboard (best-effort — writing is allowed on a user gesture), and stash
  // it in the in-app buffer so a subsequent in-sheet paste works even when the
  // browser blocks clipboard *reads*. The proxy still drives the whole-column
  // server-side copy path below.
  const captureSelection = async (ctx: any) => {
    const { text, proxy } = serializeSelectionToTSV(ctx);
    inAppClipboard.text = text;
    ctx.setClipboardProxy(proxy ?? null);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard write blocked (e.g. permission denied); the in-app buffer
      // above still makes an in-sheet paste work.
    }
  };

  const copyHijack: TableAction = {
    ...copyAction,
    targets: [],
    run: (ctx) => captureSelection(ctx),
  };

  const cutHijack: TableAction = {
    ...cutAction,
    targets: [],
    async run(ctx) {
      await captureSelection(ctx);
      ctx.clearSelection();
    },
  };

  // Whole-column copy: pasting a copied full column onto other column(s) appends
  // a `setColumn` copy op (a revertible rule → server-side copy on Save, scoped
  // to the current filtered view). Any other paste writes cells locally (those
  // overlay writes are captured back into the ops stack via `onEdit`).
  const pasteHijack: TableAction = {
    ...pasteAction,
    targets: [],
    async run(ctx) {
      const proxy = ctx.clipboardProxy;
      const source = proxy?.columnKeys?.[0];
      if (
        proxy?.cardinality === RegionCardinality.FULL_COLUMNS &&
        source != null &&
        ctx.selectionCardinality === RegionCardinality.FULL_COLUMNS
      ) {
        const targets = ctx
          .getSelectedColumnKeys()
          .filter((k: string) => k !== source);
        if (targets.length > 0) {
          const viewFilters = store.get(activeServerFiltersAtom);
          const batch = nextBatch();
          appendOps(
            targets.map((t) => makeColumnCopyOp(source, t, viewFilters, batch)),
          );
          notify(
            `Copy ${source} → ${targets.length} column${targets.length === 1 ? "" : "s"} (pending)`,
            "primary",
          );
          return;
        }
      }

      // Prefer the real system clipboard (so pastes from other apps work); when
      // the browser denies clipboard-read, fall back to the in-app buffer
      // populated by an in-sheet copy/cut. This is what fixes the
      // "Read permission denied" error on copy → paste between cells.
      let text: string | null = null;
      try {
        text = await navigator.clipboard.readText();
      } catch {
        text = inAppClipboard.text;
        if (text == null) {
          notify(
            "The browser blocked reading the clipboard. Copy within the table, then paste.",
            "danger",
          );
          return;
        }
      }
      if (!text) return;

      const edits = buildPasteEdits(ctx, text);
      if (edits.length > 0) ctx.editCells(edits);
    },
  };

  return [
    saveAction,
    resetAction,
    omitRowsAction,
    restoreRowsAction,
    groupByAction,
    hideColumnAction,
    copyHijack,
    cutHijack,
    pasteHijack,
  ];
}
