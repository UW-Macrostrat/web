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

  // Whole-column copy: pasting a copied full column onto other column(s) appends
  // a `setColumn` copy op (a revertible rule → server-side copy on Save, scoped
  // to the current filtered view). Everything else falls through to the built-in
  // paste, whose local overlay writes are captured back into the ops stack.
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
      await pasteAction.run(ctx);
    },
  };

  return [
    saveAction,
    resetAction,
    omitRowsAction,
    restoreRowsAction,
    groupByAction,
    hideColumnAction,
    { ...copyAction, targets: [] },
    { ...cutAction, targets: [] },
    pasteHijack,
  ];
}
