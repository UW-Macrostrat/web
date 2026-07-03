/**
 * Selection-aware toolbar actions for the ingestion data-sheet.
 *
 * These are `TableAction`s consumed by data-sheet's `ActionsToolbar`, which
 * renders them contextually based on the current selection cardinality. The
 * factory captures the loader/reload handles and the jotai store so an action's
 * `run` can read and mutate live view-state (filters / group / hidden columns)
 * at run time.
 */
import { RegionCardinality } from "@blueprintjs/table";
import {
  getSelectedRowIndices,
  resetChangesAction,
  TableAction,
} from "@macrostrat/data-sheet";
import type { OverlayToaster } from "@blueprintjs/core";
import type { createStore } from "jotai";
import { toBoolean } from "../components";
import { Filter } from "../utils";
import {
  filtersAtom,
  groupAtom,
  hiddenColumnsAtom,
  saveIngestUpdates,
} from "./state";

/** A row's effective omit state = its overlaid `omit`, falling back to the
 * loaded value. This (the `omit` key) is the source of truth; the struck-
 * through visual is derived from it (see `OmitSync`). */
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

/** True if the update overlay holds at least one pending change. */
function hasPendingChanges(updatedData: any[]): boolean {
  return updatedData.some(
    (row) => row != null && Object.keys(row).length > 0,
  );
}

export interface IngestActionDeps {
  url: string;
  store: JotaiStore;
  reload: () => void;
  toaster?: OverlayToaster | null;
}

export function makeIngestActions({
  url,
  store,
  reload,
  toaster,
}: IngestActionDeps): TableAction[] {
  const notify = (message: string, intent: "success" | "danger" | "primary") =>
    toaster?.show({ message, intent });

  const saveAction: TableAction = {
    id: "save-data",
    name: "Save",
    icon: "floppy-disk",
    intent: "success",
    requiresEditable: true,
    targets: ALL_CARDINALITIES,
    disabled: (ctx) => !hasPendingChanges(ctx.updatedData),
    async run(ctx) {
      const group = store.get(groupAtom);
      try {
        const n = await saveIngestUpdates(url, ctx.updatedData, ctx.data, group);
        ctx.resetChanges();
        reload();
        notify(`Saved ${n} change${n === 1 ? "" : "s"}`, "success");
      } catch (err) {
        console.error(err);
        notify("Failed to save", "danger");
      }
    },
  };

  // Omit/restore are overlay edits to the `omit` key, held locally and applied
  // on Save. The struck-through visual is derived from `omit` by `OmitSync`.
  const setOmit = (ctx: any, omit: boolean) => {
    const rows = ctx.getSelectedRowIndices();
    if (rows.length === 0) return;
    ctx.editCells(
      rows.map((rowIndex: number) => ({ rowIndex, columnKey: "omit", value: omit })),
    );
    ctx.clearSelection();
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

  const resetAction: TableAction = { ...resetChangesAction, name: "Reset" };

  return [
    saveAction,
    resetAction,
    omitRowsAction,
    restoreRowsAction,
    toggleOmittedAction,
    showHiddenAction,
  ];
}
