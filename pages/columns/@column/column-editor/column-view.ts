/** The column, drawn from the editor's units with its surfaces overlaid.
 *
 * How it is drawn — the height scale, the fixed pixel scale, whether the
 * timescale shows — comes from the display settings (`./display`, `./scale`).
 */
import h from "@macrostrat/hyper";
import classNames from "classnames";
import { useAtom, useAtomValue, useSetAtom, useStore } from "./state/ctx";
import { type ReactNode, useCallback, useMemo } from "react";
import { SegmentedControl } from "@blueprintjs/core";
import {
  ColoredUnitComponent,
  Column,
  ColumnSurfaces,
  UnitComponent,
  type ColumnSurface,
} from "@macrostrat/column-views";
import { MacrostratInteractionProvider } from "@macrostrat/data-components";
import { type Timescale, useTimescales } from "@macrostrat/data-provider";
import type { ComponentType } from "react";
import type { ColumnTimescaleLike } from "@macrostrat/column-views";
import { collapseUnconformities, roundToResolution } from "./scale";
import { unitStatus } from "./choices";
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
  addSurfaceAtAtom,
  columnToolAtom,
  drawableUnitsAtom,
  editModeAtom,
  editedUnitsAtom,
  hoveredCoordinateAtom,
  type ColumnTool,
  isSpeculativeColumnAtom,
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
  const allUnits = useAtomValue(editedUnitsAtom);
  const drawable = useAtomValue(drawableUnitsAtom);
  // A covered unit is hatched by the column (`covered`); an empty one is
  // drawn unfilled (see `withUnitStatus`)
  const units = useMemo(
    () => drawable.map((u) => ({ ...u, covered: unitStatus(u) === "covered" })),
    [drawable]
  );
  const speculative = useAtomValue(isSpeculativeColumnAtom);
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

  // Where the pointer is on the column's own index, for the add-surface tool,
  // and how much of it a pixel spans there
  const setHovered = useSetAtom(hoveredCoordinateAtom);
  const onMouseOver = useCallback(
    (_unit: any, height: number | null, evt: MouseEvent | null) => {
      if (height == null || evt == null || isNaN(height)) {
        setHovered(null);
        return;
      }
      const clientY = evt.clientY;
      setHovered((last) => {
        let perPixel = last?.perPixel ?? null;
        const dy = clientY - (last?.clientY ?? clientY);
        if (last != null && dy !== 0) {
          perPixel = Math.abs((height - last.value) / dy);
        }
        return { value: height, clientY, perPixel };
      });
    },
    [setHovered]
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
    let message = "This column has no units.";
    if (allUnits.length > 0) {
      message = "No unit can be placed yet: give one both of its boundaries.";
    }
    return h("p.column-placeholder", message);
  }

  // A measured column's axis is metres, not time, so a timescale beside it
  // would be measuring something else; and a new column placed by surface
  // order alone has no ages for it to measure.
  let timescale = showTimescale;
  if (isPositionAxis || speculative) timescale = false;

  const unitHeight = targetUnitHeight ?? DEFAULT_UNIT_HEIGHT;

  // Plain unit boxes while the surfaces are the active layer: stripped of
  // their lithology colors the units read as context, and the surface lines
  // and their tags carry the color (as the library's surface-navigation story
  // does it).
  let unitComponent: ComponentType<any> = ColoredUnitStatusComponent;
  if (mode === "surfaces") {
    unitComponent = PlainUnitStatusComponent;
  }

  // Nothing is selected *as a surface* in the unified view — its rows are
  // units, and that is where the selection lives.
  let surfaceSelection: string | null = selectedSurfaceID;
  if (mode === "unified") surfaceSelection = null;

  // Surface labels sit where the unit labels would, so only one set is drawn
  const showSurfaceLabels = mode !== "units";
  let showLabelColumn = true;
  if (showSurfaceLabels) showLabelColumn = false;

  let overlay = null;
  if (showSurfaceLabels || showSurfaceLines) {
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
        // In units mode the surfaces are context, drawn as lines only
        showLabels: showSurfaceLabels,
        // `labelStatuses` is left at the library's default — the tie points,
        // the surfaces that actually constrain the age model. Everything else
        // falls out of the boundary ages and is drawn as a line only.
        labelWidth: SURFACE_LABEL_WIDTH,
        labelPaddingLeft: SURFACE_LABEL_PADDING_LEFT,
      })
    );
  }

  const column = h(
    Column,
    {
      // The timescale's click-to-zoom: the rendered age window, the level
      // window that follows the drill path, and the transition flag.
      ...(zoom?.columnProps ?? {}),
      units,
      unitComponent,
      showLabelColumn,
      unconformityLabels: "minimal",
      collapseSmallUnconformities: collapseUnconformities(unconformityCollapse),
      showTimescale: timescale,
      // A column placed by surface order alone has no measure to label
      showAgeAxis: !speculative,
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
      onMouseOver,
    },
    overlay
  );

  return h("div.editor-column", [
    h(ColumnToolControl),
    h(ColumnClickTarget, column),
  ]);
}

/** What a click on the column does, while editing: select, or add a surface
 * where it lands. */
function ColumnToolControl() {
  const edit = useAtomValue(editModeAtom);
  const [tool, setTool] = useAtom(columnToolAtom);
  if (!edit) return null;
  return h(SegmentedControl, {
    small: true,
    className: "column-tool",
    options: [
      { label: "Select", value: "select" },
      { label: "Add surface", value: "add-surface" },
    ],
    value: tool,
    onValueChange: (value: ColumnTool) => setTool(value),
  });
}

/** With the add-surface tool, a click on the column is a new surface at the
 * height under the pointer — taken before the column's own handlers, so it
 * selects nothing. */
function ColumnClickTarget({ children }: { children: ReactNode }) {
  const edit = useAtomValue(editModeAtom);
  const tool = useAtomValue(columnToolAtom);
  const addSurfaceAt = useSetAtom(addSurfaceAtAtom);
  const intervals = useIntervalDefs();
  const store = useStore();
  const adding = edit && tool === "add-surface";

  const onClickCapture = useCallback(
    (evt: React.MouseEvent) => {
      if (!adding) return;
      evt.stopPropagation();
      evt.preventDefault();
      const hovered = store.get(hoveredCoordinateAtom);
      if (hovered == null || isNaN(hovered.value)) return;
      // No finer than the drawing shows
      const coord = roundToResolution(hovered.value, hovered.perPixel);
      addSurfaceAt({ coord, intervals });
    },
    [adding, store, addSurfaceAt, intervals]
  );

  return h(
    "div.column-click-target",
    { className: classNames({ adding }), onClickCapture },
    children
  );
}

/** A unit component that draws an empty unit — a placeholder in the section
 * — as an unfilled box, whatever `base` draws the rest as. */
function withUnitStatus(base: ComponentType<any>): ComponentType<any> {
  return function UnitStatusComponent(props: any) {
    if (unitStatus(props.division) === "empty") return h(EmptyUnit, props);
    return h(base, props);
  };
}

/** An unfilled box. Its own component, so a unit that becomes empty is
 * remounted: the library's unit calls its pattern hook only when it isn't
 * handed a fill, and switching one instance between the two would change
 * its hooks. */
function EmptyUnit(props: any) {
  return h(UnitComponent, { ...props, fill: "transparent", backgroundColor: null });
}

const ColoredUnitStatusComponent = withUnitStatus(ColoredUnitComponent);
const PlainUnitStatusComponent = withUnitStatus(UnitComponent);

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
  const timescales = useTimescales();

  const referenced = useMemo(() => {
    if (mode !== "surfaces" || shown === "ics") return [];
    let sources = surfaces;
    if (shown === "selection") {
      sources = selectedSurface == null ? [] : [selectedSurface];
    }
    return referencedTimescaleIDs(sources, intervals, timescales);
  }, [mode, shown, surfaces, selectedSurface, intervals, timescales]);

  return useMemo(() => {
    if (referenced.length === 0) return undefined;
    return [{ id: INTERNATIONAL_TIMESCALE_ID, levels }, ...referenced];
  }, [referenced, levels?.[0], levels?.[1]]);
}

/** Macrostrat's international timescale — the one `Column` draws by default,
 * and the one an explicit `timescales` list has to name for itself. */
const INTERNATIONAL_TIMESCALE_ID = 11;

/** The timescales the surfaces' calibration intervals refer to — one per
 * interval, though an interval is often listed in several (Maastrichtian is
 * in six). Waits for the timescale definitions, which decide the choice. */
function referencedTimescaleIDs(
  surfaces: { calibration?: { id: number } | null }[],
  intervals: Map<number, IntervalDef> | null,
  timescales: Map<number, Timescale> | null
): number[] {
  if (intervals == null || timescales == null) return [];
  const ids = new Set<number>();
  for (const surface of surfaces) {
    const interval = intervals.get(surface.calibration?.id as number);
    const id = intervalTimescaleID(interval, timescales);
    if (id != null) ids.add(id);
  }
  return Array.from(ids);
}

/** The one timescale an interval is read against. None when it belongs to
 * any of the international scales, since the international timescale is
 * already drawn; otherwise the most specific one it is in — the timescale
 * with the fewest intervals. */
function intervalTimescaleID(
  interval: IntervalDef | undefined,
  timescales: Map<number, Timescale>
): number | null {
  const memberships: number[] = ((interval as any)?.timescales ?? [])
    .map((t) => t?.timescale_id)
    .filter((id) => id != null);
  if (memberships.some((id) => isInternational(id, timescales))) return null;

  let best: number | null = null;
  let bestSize = Infinity;
  for (const id of memberships) {
    const size = timescales.get(id)?.n_intervals ?? Infinity;
    // Ties go to the lower id, so the choice doesn't depend on list order
    if (size < bestSize || (size === bestSize && id < (best ?? Infinity))) {
      best = id;
      bestSize = size;
    }
  }
  return best;
}

/** The international scales (ages, epochs, periods, eras, eons, and the
 * combined one) share the international timescale's reference. */
function isInternational(
  id: number,
  timescales: Map<number, Timescale>
): boolean {
  if (id === INTERNATIONAL_TIMESCALE_ID) return true;
  const ref = timescales.get(INTERNATIONAL_TIMESCALE_ID)?.ref_id;
  return ref != null && timescales.get(id)?.ref_id === ref;
}
