/** The column, drawn from the editor's units with its surfaces overlaid. */
import h from "@macrostrat/hyper";
import { useAtomValue, useSetAtom } from "jotai";
import { useCallback } from "react";
import {
  ColoredUnitComponent,
  Column,
  ColumnSurfaces,
  type ColumnSurface,
} from "@macrostrat/column-views";
import {
  editingModeAtom,
  selectedSurfaceIDAtom,
  selectedUnitIDAtom,
  surfacesAtom,
  unitsAtom,
} from "./state";

export function EditorColumn() {
  const units = useAtomValue(unitsAtom);
  const surfaces = useAtomValue(surfacesAtom);
  const mode = useAtomValue(editingModeAtom);
  const selectedUnitID = useAtomValue(selectedUnitIDAtom);
  const setSelectedUnitID = useSetAtom(selectedUnitIDAtom);
  const selectedSurfaceID = useAtomValue(selectedSurfaceIDAtom);
  const setSelectedSurfaceID = useSetAtom(selectedSurfaceIDAtom);

  const onUnitSelected = useCallback(
    (unitID: number | null) => {
      setSelectedUnitID(unitID);
    },
    [setSelectedUnitID]
  );

  const onSelectSurface = useCallback(
    (surface: ColumnSurface | null) => {
      setSelectedSurfaceID((surface?.id as string) ?? null);
    },
    [setSelectedSurfaceID]
  );

  if (units.length === 0) {
    return h("p", "This column has no units.");
  }

  return h(
    Column,
    {
      units,
      unitComponent: ColoredUnitComponent,
      unconformityLabels: "minimal",
      collapseSmallUnconformities: true,
      showTimescale: true,
      columnWidth: 200,
      width: 340,
      targetUnitHeight: 24,
      keyboardNavigation: true,
      selectedUnit: selectedUnitID,
      onUnitSelected,
    },
    h(ColumnSurfaces, {
      // The editor's surfaces are its own projection of the units it is
      // editing, not the stored age model
      surfaces,
      selectedSurface: selectedSurfaceID,
      onSelectSurface,
      // In units mode the surfaces are context, drawn as lines only; in
      // surfaces mode they take the label column over from the unit labels.
      showLabels: mode === "surfaces",
      // Every surface is an edit target here, so all of them are labeled —
      // not just the tie points the library labels by default.
      labelStatuses: null,
    })
  );
}
