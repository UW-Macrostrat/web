/** The column, drawn from the editor's units with its surfaces overlaid.
 *
 * How it is drawn — the height scale, the fixed pixel scale, whether the
 * timescale shows — comes from the display settings (`./display`, `./scale`).
 */
import h from "@macrostrat/hyper";
import { useAtomValue, useSetAtom } from "jotai";
import { useCallback, useMemo } from "react";
import {
  ColoredUnitComponent,
  Column,
  ColumnSurfaces,
  UnitComponent,
  type ColumnSurface,
} from "@macrostrat/column-views";
import { MacrostratInteractionProvider } from "@macrostrat/data-components";
import type { ComponentType } from "react";
import type { ColumnTimescaleLike } from "@macrostrat/column-views";
import { collapseUnconformities } from "./scale";
import type { IntervalDef } from "./boundaries";
import {
  selectedSurfaceAtom,
  shownTimescalesAtom,
  useColumnFocus,
  useIntervalDefs,
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

/** A floor on how short a section can be drawn, whatever it holds.
 *
 * The library's floor is `targetUnitHeight` — one unit's worth — so a section
 * with a unit or two collapses to a few pixels, which is unreadable and
 * unclickable just when a zoomed-in view has left you with only a few. This is
 * a floor, so it never shrinks a section that has earned more height, and it
 * follows the unit height up rather than capping it. */
const MIN_SECTION_HEIGHT = 120;

/** Pixels of the abutting sections revealed past a focused window, so the
 * intervals either side of the one you drilled into stay on screen and
 * clickable — which is how you walk up and down the timescale. */
const WINDOW_PADDING = 30;
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
  const zoom = useColumnFocus();
  const timescales = useColumnTimescales(mode, zoom?.timescaleLevels);

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

  const unitHeight = targetUnitHeight ?? DEFAULT_UNIT_HEIGHT;

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
      // The timescale's click-to-zoom: the rendered age window, the level
      // window that follows the drill path, and the transition flag.
      ...(zoom?.columnProps ?? {}),
      units,
      unitComponent,
      unconformityLabels: "minimal",
      collapseSmallUnconformities: collapseUnconformities(
        unconformityCollapse
      ),
      showTimescale: timescale,
      // Supersedes `timescaleLevels`, so the zoom's level window is folded
      // into the international entry (see `useColumnTimescales`).
      timescales,
      columnWidth: 200,
      width: columnWidthFor(timescale),
      targetUnitHeight: unitHeight,
      minSectionHeight: Math.max(MIN_SECTION_HEIGHT, unitHeight),
      windowPadding: WINDOW_PADDING,
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


/** The timescales drawn beside the column.
 *
 * Always the international one, carrying whatever level window the timescale
 * zoom has drilled to. In surfaces mode it can be joined by the timescales a
 * surface's calibration interval actually belongs to — the answer to "what was
 * this referred to?", which the international scale alone can't give for a
 * column calibrated against a regional set.
 *
 * `undefined` rather than a one-element list when there is nothing to add, so
 * `Column` keeps its own `timescaleLevels` handling.
 */
function useColumnTimescales(
  mode: string,
  levels: [number, number] | undefined
): ColumnTimescaleLike[] | undefined {
  const shown = useAtomValue(shownTimescalesAtom);
  const surfaces = useAtomValue(surfacesAtom);
  const selectedSurface = useAtomValue(selectedSurfaceAtom);
  const intervals = useIntervalDefs();

  const referenced = useMemo(() => {
    if (mode !== "surfaces" || shown === "ics") return [];
    let sources = surfaces;
    if (shown === "selection") {
      sources = selectedSurface == null ? [] : [selectedSurface];
    }
    return referencedTimescaleIDs(sources, intervals);
  }, [mode, shown, surfaces, selectedSurface, intervals]);

  return useMemo(() => {
    if (referenced.length === 0) return undefined;
    return [{ id: INTERNATIONAL_TIMESCALE_ID, levels }, ...referenced];
  }, [referenced, levels?.[0], levels?.[1]]);
}

/** Macrostrat's international timescale — the one `Column` draws by default,
 * and the one an explicit `timescales` list has to name for itself. */
const INTERNATIONAL_TIMESCALE_ID = 11;

function referencedTimescaleIDs(
  surfaces: { calibration?: { id: number } | null }[],
  intervals: Map<number, IntervalDef> | null
): number[] {
  if (intervals == null) return [];
  const ids = new Set<number>();
  for (const surface of surfaces) {
    const interval = intervals.get(surface.calibration?.id as number);
    for (const timescale of (interval as any)?.timescales ?? []) {
      const id = timescale?.timescale_id;
      // The international scale is already drawn, with its own levels.
      if (id == null || id === INTERNATIONAL_TIMESCALE_ID) continue;
      ids.add(id);
    }
  }
  return Array.from(ids);
}
