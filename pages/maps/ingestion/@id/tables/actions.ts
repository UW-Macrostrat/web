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
  patchColumnForRows,
  saveIngestUpdates,
} from "./state";

/** Remove the given indices from an array while preserving the positions of the
 * rest. Works on sparse arrays (holes become `undefined`), so the index-keyed
 * edit overlay stays aligned with the shortened data. */
function removeIndices<T>(arr: T[], drop: Set<number>): T[] {
  const out: T[] = [];
  for (let i = 0; i < arr.length; i++) {
    if (!drop.has(i)) out.push(arr[i]);
  }
  return out;
}

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
  removeRows: (pkids: any[]) => void;
  patchRows: (pkids: any[], patch: Record<string, any>) => void;
  toaster?: OverlayToaster | null;
}

export function makeIngestActions({
  url,
  store,
  reload,
  removeRows,
  patchRows,
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

  // Omit applies immediately: PATCH omit=true, then optimistically splice the
  // rows out of the store (all three arrays together, so the index-keyed edit
  // overlay stays aligned) and drop them from the loader cache — no full reload,
  // so other unsaved edits survive.
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
    async run(ctx) {
      const indices = ctx
        .getSelectedRowIndices()
        .filter((i: number) => ctx.data[i] != null && !isOmitted(ctx, i));
      if (indices.length === 0) return;
      const baseRows = indices.map((i: number) => ctx.data[i]);
      const group = store.get(groupAtom);
      try {
        await patchColumnForRows(url, baseRows, "omit", true, group);
        const drop = new Set<number>(indices);
        ctx.setState({
          data: removeIndices(ctx.data, drop),
          updatedData: removeIndices(ctx.updatedData, drop),
          rowStatus: removeIndices(ctx.rowStatus, drop),
          selection: [],
          focusedCell: null,
          topLeftCell: null,
        });
        removeRows(baseRows);
        notify(
          `Omitted ${indices.length} row${indices.length === 1 ? "" : "s"}`,
          "success",
        );
      } catch (err) {
        console.error(err);
        notify("Failed to omit rows", "danger");
      }
    },
  };

  // Restore is only reachable in "show omitted" mode (omitted rows loaded and
  // struck through). PATCH omit=false and clear it in place so the row un-strikes.
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
    async run(ctx) {
      const indices = ctx
        .getSelectedRowIndices()
        .filter((i: number) => ctx.data[i] != null && isOmitted(ctx, i));
      if (indices.length === 0) return;
      const baseRows = indices.map((i: number) => ctx.data[i]);
      const group = store.get(groupAtom);
      try {
        await patchColumnForRows(url, baseRows, "omit", false, group);
        const next = ctx.data.slice();
        for (const i of indices) next[i] = { ...next[i], omit: false };
        ctx.setState({ data: next, selection: [] });
        patchRows(baseRows, { omit: false });
        notify(
          `Restored ${indices.length} row${indices.length === 1 ? "" : "s"}`,
          "success",
        );
      } catch (err) {
        console.error(err);
        notify("Failed to restore rows", "danger");
      }
    },
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
