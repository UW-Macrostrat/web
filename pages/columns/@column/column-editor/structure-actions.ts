/** The unit sheets' structural actions: a unit above or below the selected
 * one, a surface through it, removal — and, with nothing selected, a unit at
 * the top of the column (its first, in a new one). They sit in the sheet's
 * toolbar with the other contextual actions, and only while editing.
 *
 * Removal is the library's own `deleteRowsAction` (and Backspace on selected
 * rows): the sheet reports it as a `deleteRows` edit, which the unit sheets
 * turn into the transaction's removal (see `UnitBackedSheet`).
 *
 * The unit acted on is the editor's selected unit, which the sheet's row
 * selection is bridged to, rather than the rows the action context resolves:
 * the toolbar builds that context when the selection changes, not when the
 * rows do, so just after an insert — the new unit selected, the sheet not yet
 * holding it — the context's rows are the old ones.
 */
import { useMemo, useRef } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { RegionCardinality } from "@blueprintjs/table";
import { deleteRowsAction, type TableAction } from "@macrostrat/data-sheet";
import type { UnitLong } from "@macrostrat/api-types";
import {
  insertUnitAtom,
  selectedUnitIDAtom,
  splitUnitAtom,
  useIntervalDefs,
} from "./state";
import type { InsertPlace } from "./structure";

/** One identity for the life of the sheet, like the focus actions: the
 * actions sit in the sheet's props, and new ones on every render would
 * churn it. The interval definitions they need are read through a ref. */
export function useStructureActions(): TableAction<UnitLong>[] {
  const insertUnit = useSetAtom(insertUnitAtom);
  const splitUnit = useSetAtom(splitUnitAtom);
  const intervals = useIntervalDefs();
  const intervalsRef = useRef(intervals);
  intervalsRef.current = intervals;
  const selectedUnitID = useAtomValue(selectedUnitIDAtom);
  const selectedRef = useRef(selectedUnitID);
  selectedRef.current = selectedUnitID;

  return useMemo(() => {
    // Read when the action runs, by which time the selection has reached the
    // page; the context's rows are the fallback
    const target = (ctx): number | null =>
      selectedRef.current ?? ctx.getSelectedRows()[0]?.unit_id ?? null;

    const insert = (place: InsertPlace) => (ctx) => {
      insertUnit({ unit_id: target(ctx), place, intervals: intervalsRef.current });
    };

    // The selection's shape, not its rows, which can lag (see above)
    const oneRow = (ctx) => ctx.selectionShape.rows === 1;
    const rowTargets = [RegionCardinality.CELLS, RegionCardinality.FULL_ROWS];

    return [
      {
        id: "unit-above",
        name: "Unit above",
        icon: "add-row-top",
        group: "structure",
        requiresEditable: true,
        description: "Add a unit resting on this one's top",
        targets: rowTargets,
        appliesTo: oneRow,
        run: insert("above"),
      },
      {
        id: "unit-below",
        name: "Unit below",
        icon: "add-row-bottom",
        group: "structure",
        requiresEditable: true,
        description: "Add a unit beneath this one's base",
        targets: rowTargets,
        appliesTo: oneRow,
        run: insert("below"),
      },
      {
        id: "split-unit",
        name: "Split",
        icon: "horizontal-inbetween",
        group: "structure",
        requiresEditable: true,
        description:
          "Put a new surface halfway through this unit, dividing it in two",
        targets: rowTargets,
        appliesTo: oneRow,
        run(ctx) {
          const unit_id = target(ctx);
          if (unit_id == null) return;
          splitUnit({ unit_id, intervals: intervalsRef.current });
        },
      },
      { ...deleteRowsAction, group: "structure" },
      {
        id: "add-unit",
        name: "Add unit",
        icon: "add-row-top",
        group: "structure",
        requiresEditable: true,
        description: "Add a unit at the top of the column",
        // No selection reads as the whole table
        targets: [RegionCardinality.FULL_TABLE],
        run() {
          insertUnit({
            unit_id: null,
            place: "above",
            intervals: intervalsRef.current,
          });
        },
      },
    ] as TableAction<UnitLong>[];
  }, [insertUnit, splitUnit]);
}
