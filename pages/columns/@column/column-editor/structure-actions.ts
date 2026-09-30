/** The unit sheets' structural actions: a unit above or below the selected
 * one, a surface through it, removal — and, with nothing selected, a unit at
 * the top of the column (its first, in a new one). They sit in the sheet's
 * toolbar with the other contextual actions, and only while editing.
 *
 * Removal is the library's own `deleteRowsAction` (and Backspace on selected
 * rows): the sheet reports it as a `deleteRows` edit, which the unit sheets
 * turn into the transaction's removal (see `UnitBackedSheet`).
 */
import { useMemo, useRef } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { RegionCardinality } from "@blueprintjs/table";
import { deleteRowsAction, type TableAction } from "@macrostrat/data-sheet";
import type { UnitLong } from "@macrostrat/api-types";
import {
  addSurfaceAtom,
  deleteSurfacesAtom,
  draftSurfacesInUseAtom,
  fillUnitsAtom,
  insertUnitAtom,
  selectedSurfaceIDAtom,
  splitUnitAtom,
  useIntervalDefs,
} from "./state";
import type { EditorSurface } from "./surfaces";
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

  return useMemo(() => {
    const target = (ctx): number | null =>
      ctx.getSelectedRows()[0]?.unit_id ?? null;

    const insert = (place: InsertPlace) => (ctx) => {
      insertUnit({ unit_id: target(ctx), place, intervals: intervalsRef.current });
    };

    const oneRow = (ctx) => ctx.getSelectedRows().length === 1;
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

/** A new column's surfaces sheet: a surface above or below the selected one,
 * or at the top with nothing selected; *Fill units* between surfaces no unit
 * spans; and removal of a surface no unit rests on. Only on a new column,
 * whose surfaces are records — a loaded column's are a projection of its
 * units, and are changed through them. */
export function useSurfaceStructureActions(): TableAction<EditorSurface>[] {
  const addSurface = useSetAtom(addSurfaceAtom);
  const fillUnits = useSetAtom(fillUnitsAtom);
  const deleteSurfaces = useSetAtom(deleteSurfacesAtom);
  const inUse = useAtomValue(draftSurfacesInUseAtom);
  const inUseRef = useRef(inUse);
  inUseRef.current = inUse;
  // `disabled` is handed the sheet's store state rather than an action
  // context, so it reads the selection the page keeps
  const selectedID = useAtomValue(selectedSurfaceIDAtom);
  const selectedRef = useRef(selectedID);
  selectedRef.current = selectedID;

  return useMemo(() => {
    const target = (ctx): string | null =>
      ctx.getSelectedRows()[0]?.id ?? null;
    const oneRow = (ctx) => ctx.getSelectedRows().length === 1;
    const rowTargets = [RegionCardinality.CELLS, RegionCardinality.FULL_ROWS];
    const add = (place: InsertPlace) => (ctx) =>
      addSurface({ surface_id: target(ctx), place });

    const fill: TableAction<EditorSurface> = {
      id: "fill-units",
      name: "Fill units",
      icon: "column-layout",
      group: "structure",
      requiresEditable: true,
      description: "Put a unit between every pair of surfaces that has none",
      targets: [RegionCardinality.FULL_TABLE, ...rowTargets],
      run: () => fillUnits(),
    };

    return [
      {
        id: "surface-above",
        name: "Surface above",
        icon: "add-row-top",
        group: "structure",
        requiresEditable: true,
        description: "Add a surface just above this one",
        targets: rowTargets,
        appliesTo: oneRow,
        run: add("above"),
      },
      {
        id: "surface-below",
        name: "Surface below",
        icon: "add-row-bottom",
        group: "structure",
        requiresEditable: true,
        description: "Add a surface just below this one",
        targets: rowTargets,
        appliesTo: oneRow,
        run: add("below"),
      },
      {
        id: "delete-surface",
        name: "Delete",
        icon: "trash",
        intent: "danger",
        group: "structure",
        requiresEditable: true,
        description: "Remove this surface; only one no unit rests on",
        targets: [RegionCardinality.FULL_ROWS],
        appliesTo: oneRow,
        disabled: () => {
          const id = selectedRef.current as string | null;
          return id == null || inUseRef.current.has(id);
        },
        run(ctx) {
          const id = target(ctx);
          if (id != null) deleteSurfaces([id]);
        },
      },
      {
        id: "add-surface",
        name: "Add surface",
        icon: "add-row-top",
        group: "structure",
        requiresEditable: true,
        description: "Add a surface at the top of the column",
        targets: [RegionCardinality.FULL_TABLE],
        run: () => addSurface({ surface_id: null, place: "above" }),
      },
      fill,
    ] as TableAction<EditorSurface>[];
  }, [addSurface, fillUnits, deleteSurfaces]);
}
