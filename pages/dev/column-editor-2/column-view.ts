/** The column, drawn from the editor's units with its surfaces overlaid.
 *
 * How it is drawn — the height scale, the fixed pixel scale, whether the
 * timescale shows — comes from the display settings (`./display`, `./scale`).
 */
import h from "@macrostrat/hyper";
import { useAtomValue, useSetAtom } from "jotai";
import { useCallback } from "react";
import {
  ColoredUnitComponent,
  Column,
  ColumnSurfaces,
  UnitComponent,
  type ColumnSurface,
} from "@macrostrat/column-views";
import { MacrostratInteractionProvider } from "@macrostrat/data-components";
import type { ComponentType } from "react";
import { collapseUnconformities } from "./scale";
import {
  DEFAULT_UNIT_HEIGHT,
  columnScaleOptionsAtom,
  editingModeAtom,
  pixelScaleAtom,
  selectedSurfaceIDAtom,
  selectedUnitIDAtom,
  showSurfaceLinesAtom,
  editedUnitsAtom,
  showTimescaleAtom,
  surfacesAtom,
  targetUnitHeightAtom,
  unconformityCollapseAtom,
} from "./state";

/** Width of the surfaces' label column, connector included. It is an ordinary
 * flex child of the library's `.column` row, so this *is* the space it takes
 * beside the units.
 *
 * It has to fit an `IntervalTag`, which is an `inline-flex` with
 * `flex-flow: row wrap` — so a box too narrow for "85% Neoproterozoic" doesn't
 * clip or ellipsize it, it breaks the proportion onto a second line and the
 * label grows taller. Room for the longest interval names is what stops that;
 * after the connector gutter and the note's own margins this leaves about
 * 150px of text. Still under the library's 200 default. */
export const SURFACE_LABEL_WIDTH = 190;
const SURFACE_LABEL_PADDING_LEFT = 20;

export function EditorColumn() {
  const units = useAtomValue(editedUnitsAtom);
  const surfaces = useAtomValue(surfacesAtom);
  const mode = useAtomValue(editingModeAtom);
  const selectedUnitID = useAtomValue(selectedUnitIDAtom);
  const setSelectedUnitID = useSetAtom(selectedUnitIDAtom);
  const selectedSurfaceID = useAtomValue(selectedSurfaceIDAtom);
  const setSelectedSurfaceID = useSetAtom(selectedSurfaceIDAtom);

  const { axisType, hybridScale, isPositionAxis } = useAtomValue(
    columnScaleOptionsAtom
  );
  const pixelScale = useAtomValue(pixelScaleAtom);
  const targetUnitHeight = useAtomValue(targetUnitHeightAtom);
  const showTimescale = useAtomValue(showTimescaleAtom);
  const showSurfaceLines = useAtomValue(showSurfaceLinesAtom);
  const unconformityCollapse = useAtomValue(unconformityCollapseAtom);

  const onUnitSelected = useCallback(
    (unitID: number | null) => {
      setSelectedUnitID(unitID);
    },
    [setSelectedUnitID]
  );

  const onSelectSurface = useCallback(
    (surface: ColumnSurface | null) => {
      if (mode !== "unified") {
        setSelectedSurfaceID((surface?.id as string) ?? null);
        return;
      }
      // The unified sheet's rows are units, so a surface hands off to the unit
      // resting on it — the same handoff the library's navigation story makes
      // when it switches modes.
      const unitID = surface?.unitsAbove?.[0] ?? surface?.unitsBelow?.[0];
      setSelectedUnitID(unitID ?? null);
    },
    [mode, setSelectedSurfaceID, setSelectedUnitID]
  );

  if (units.length === 0) {
    return h("p", "This column has no units.");
  }

  // A measured column's axis is metres, not time, so a timescale beside it
  // would be measuring something else.
  let timescale = showTimescale;
  if (isPositionAxis) timescale = false;

  // Plain unit boxes while the surfaces are the active layer: stripped of
  // their lithology colors the units read as context, and the surface lines
  // and their tags carry the color (as the library's surface-navigation story
  // does it).
  let unitComponent: ComponentType<any> = ColoredUnitComponent;
  if (mode === "surfaces") {
    unitComponent = UnitComponent;
  }

  // Nothing is selected *as a surface* in the unified view — its rows are
  // units, and that is where the selection lives.
  let surfaceSelection: string | null = selectedSurfaceID;
  if (mode === "unified") surfaceSelection = null;

  let overlay = null;
  if (mode !== "units" || showSurfaceLines) {
    overlay = h(
      MacrostratInteractionProvider,
      // A tag in the label column is a handle on its surface, not a way into
      // the lexicon. The ambient provider (`NavigationLinkProvider`) would
      // make every `IntervalTag` an anchor to `/lex/intervals/…`, and that
      // anchor swallows the click before the note's own handler sees it —
      // so the subtree gets a provider that inherits nothing and links
      // nothing, and clicks reach the selection instead.
      { inherit: false },
      h(ColumnSurfaces, {
        // The editor's surfaces are its own projection of the units it is
        // editing, not the stored age model
        surfaces,
        selectedSurface: surfaceSelection,
        onSelectSurface,
        // In units mode the surfaces are context, drawn as lines only; in
        // surfaces mode they take the label column over from the unit labels.
        showLabels: mode !== "units",
        // `labelStatuses` is left at the library's default — the tie points,
        // the surfaces that actually constrain the age model. Everything else
        // falls out of the boundary ages and is drawn as a line only.
        labelWidth: SURFACE_LABEL_WIDTH,
        labelPaddingLeft: SURFACE_LABEL_PADDING_LEFT,
      })
    );
  }

  return h(
    Column,
    {
      units,
      unitComponent,
      unconformityLabels: "minimal",
      collapseSmallUnconformities: collapseUnconformities(
        unconformityCollapse
      ),
      showTimescale: timescale,
      columnWidth: 200,
      width: columnWidthFor(timescale),
      targetUnitHeight: targetUnitHeight ?? DEFAULT_UNIT_HEIGHT,
      pixelScale: pixelScale ?? undefined,
      axisType,
      hybridScale: hybridScale ?? undefined,
      keyboardNavigation: true,
      selectedUnit: selectedUnitID,
      onUnitSelected,
    },
    overlay
  );
}

/** Total width of the column, axis included. Without a timescale beside it
 * the axis needs far less room than the age column's. */
function columnWidthFor(showTimescale: boolean) {
  if (showTimescale) return 340;
  return 270;
}
