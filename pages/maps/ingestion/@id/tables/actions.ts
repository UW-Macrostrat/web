/**
 * Selection-aware toolbar actions for the ingestion data-sheet.
 *
 * All mutations go through the pending-ops stack (`opsAtom`): edits, omit /
 * restore, and whole-column copy append ops; Save flushes the stack to the API;
 * Reset clears it. The edit overlay is derived from the stack (see
 * `pending-ops.ts` / `OpsSync`), so Save/Reset disabled state can read the
 * (derived) `updatedData` reactively.
 */
import { RegionCardinality } from "@blueprintjs/table";
import {
  copyAction,
  cutAction,
  getSelectedRowIndices,
  pasteAction,
  TableAction,
} from "@macrostrat/data-sheet";
import type { OverlayToaster } from "@blueprintjs/core";
import type { createStore } from "jotai";
import { toBoolean } from "../components";
import { Filter } from "../utils";
import { filtersAtom, groupAtom, hiddenColumnsAtom, saveProgressAtom } from "./state";
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

const ALL_CARDINALITIES: TableAction["targets"] = [
  "none",
  RegionCardinality.FULL_TABLE,
  RegionCardinality.FULL_ROWS,
  RegionCardinality.FULL_COLUMNS,
  RegionCardinality.CELLS,
];

/** True if the (derived) overlay holds at least one pending change. */
function hasPendingChanges(updatedData: any[]): boolean {
  return updatedData.some((row) => row != null && Object.keys(row).length > 0);
}

export interface IngestActionDeps {
  url: string;
  store: JotaiStore;
  reload: () => void;
  toaster?: OverlayToaster | null;
}

/** Named actions for the contextual toolbar, plus hotkey-only clipboard
 * actions (`targets: []` keeps them out of any toolbar while their hotkeys
 * still register). */
export interface IngestActions {
  clipboard: TableAction[];
  save: TableAction;
  reset: TableAction;
  omit: TableAction;
  restore: TableAction;
  toggleOmitted: TableAction;
  showHidden: TableAction;
}

export function makeIngestActions({
  url,
  store,
  reload,
  toaster,
}: IngestActionDeps): IngestActions {
  const notify = (message: string, intent: "success" | "danger" | "primary") =>
    toaster?.show({ message, intent });

  const appendOps = (ops: PendingOp[]) =>
    store.set(opsAtom, [...store.get(opsAtom), ...ops]);

  const saveAction: TableAction = {
    id: "save-data",
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
    name: "Omit rows",
    icon: "eye-off",
    requiresEditable: true,
    targets: [RegionCardinality.FULL_ROWS],
    disabled: (s: any) => {
      const rows = getSelectedRowIndices(s.selection);
      return rows.length === 0 || rows.every((r) => isOmitted(s, r));
    },
    run: (ctx) => setOmit(ctx, true),
  };

  const restoreRowsAction: TableAction = {
    id: "restore-rows",
    name: "Restore rows",
    icon: "eye-open",
    requiresEditable: true,
    targets: [RegionCardinality.FULL_ROWS],
    disabled: (s: any) => {
      const rows = getSelectedRowIndices(s.selection);
      return rows.length === 0 || !rows.some((r) => isOmitted(s, r));
    },
    run: (ctx) => setOmit(ctx, false),
  };

  const toggleOmittedAction: TableAction = {
    id: "toggle-omitted",
    name: "Show/hide omitted",
    icon: "eye-open",
    requiresEditable: false,
    targets: ["none", RegionCardinality.FULL_TABLE],
    run() {
      const filters = store.get(filtersAtom);
      const next = { ...filters };
      if (next["omit"]?.is_valid()) {
        delete next["omit"];
      } else {
        next["omit"] = new Filter("omit", "is_distinct_from", "true");
      }
      store.set(filtersAtom, next);
    },
  };

  const showHiddenAction: TableAction = {
    id: "show-hidden-columns",
    name: "Show hidden columns",
    icon: "th",
    requiresEditable: false,
    targets: ["none", RegionCardinality.FULL_TABLE],
    run() {
      store.set(hiddenColumnsAtom, []);
    },
  };

  // Whole-column copy: pasting a copied full column onto other column(s) appends
  // a `setColumn` copy op (a revertible rule → server-side copy on Save).
  // Everything else falls through to the built-in paste, whose local overlay
  // writes are captured back into the ops stack as cell edits.
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
          const filters = store.get(filtersAtom);
          const batch = nextBatch();
          appendOps(
            targets.map((t) => makeColumnCopyOp(source, t, filters, batch)),
          );
          notify(
            `Copy ${source} → ${targets.length} column${targets.length === 1 ? "" : "s"} (pending)`,
            "primary",
          );
          return;
        }
      }
      await pasteAction.run(ctx);
    },
  };

  return {
    clipboard: [
      { ...copyAction, targets: [] },
      { ...cutAction, targets: [] },
      pasteHijack,
    ],
    save: saveAction,
    reset: resetAction,
    omit: omitRowsAction,
    restore: restoreRowsAction,
    toggleOmitted: toggleOmittedAction,
    showHidden: showHiddenAction,
  };
}
