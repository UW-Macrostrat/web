/** The column, drawn from the editor's units with its surfaces overlaid. */
import h from "@macrostrat/hyper";
import { useAtomValue, useSetAtom } from "jotai";
import { useCallback } from "react";
import { ColoredUnitComponent, Column } from "@macrostrat/column-views";
import {
  editingModeAtom,
  selectedSurfaceIDAtom,
  selectedUnitIDAtom,
  surfacesAtom,
  unitsAtom,
} from "./state";
import { SurfacesOverlay } from "./surfaces-overlay";

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
      // Surfaces mode gives the label column over to the surface labels
      showLabelColumn: mode === "units",
      targetUnitHeight: 24,
      keyboardNavigation: true,
      selectedUnit: selectedUnitID,
      onUnitSelected,
    },
    h(SurfacesOverlay, {
      surfaces,
      selectedSurface: selectedSurfaceID,
      onSelectSurface: setSelectedSurfaceID,
      // In units mode the surfaces are context, drawn as lines only; in
      // surfaces mode they take the label column.
      showLabels: mode === "surfaces",
    })
  );
}
