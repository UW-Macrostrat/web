/** The correlation chart page, on the hybrid content/map frame.
 *
 * The chart is the content, at the full page width; the correlation map is
 * either a small inset over it (`content-inset`, the default) or a sidebar
 * card beside the chart's column list and unit details (`content-primary`).
 * Selection state lives in the map store (`ColumnCorrelationProvider`), which
 * wraps every slot through the frame's `wrap` hook so it can read the project
 * filter the page seeds into the frame.
 */
import { C, compose } from "@macrostrat/hyper";
import h from "./main.module.sass";
import { mapboxAccessToken, apiV2Prefix } from "@macrostrat-web/settings";
import {
  Alignment,
  Button,
  FormGroup,
  Intent,
  OverlaysProvider,
  PopoverNext,
  SegmentedControl,
  Switch,
} from "@blueprintjs/core";
import { ReactNode, useEffect, useMemo } from "react";
import { DisplayDensity, useCorrelationDiagramStore } from "./state";
import { PatternProvider } from "~/_providers";
import {
  DarkModeProvider,
  ErrorBoundary,
  useAsyncMemo,
} from "@macrostrat/ui-components";
import {
  MacrostratDataProvider,
  fetchUnits,
  useMacrostratColumnInfo,
  useMacrostratStore,
} from "@macrostrat/data-provider";
import {
  Identifier,
  SortableDragHandle,
  SortableItems,
} from "@macrostrat/data-components";
import {
  CorrelationChart,
  MacrostratColumnStateProvider,
  UnitDetailsPanel,
  type ColumnHeaderProps,
} from "@macrostrat/column-views";
import {
  ColumnCorrelationMap,
  ColumnCorrelationProvider,
  useColumnMapLink,
  useCorrelationMapStore,
  useFocusedColumns,
  useSelectionMode,
} from "@macrostrat/map-views";
import { useMapStyleOperator } from "@macrostrat/mapbox-react";
import { atom, useAtomValue } from "jotai";
import {
  getCorrelationHashParams,
  setHashStringForCorrelation,
} from "./hash-string";
import {
  HybridPage,
  layoutModeAtom,
  type LayoutCapabilities,
} from "~/layouts/hybrid";
import {
  ageExtentOfUnits,
  TimeFilterPanel,
  TimeFilterProvider,
  TimeFilterTag,
  useTargetUnitHeight,
  useTimeFilterWindow,
  type TimeFilterAtom,
  type TimeFilterParams,
} from "~/components/time-filter";
import {
  projectIDParam,
  ProjectFilterControl,
  ProjectFilterProvider,
  ProjectFilterTag,
  useProjectIDs,
  type ProjectFilterAtom,
  type ProjectFilterValue,
} from "~/components/project-filter";

/** The page's filters, in the URL hash beside `section` / `columns` / `unit`.
 * Seeded into the frame's jotai scope through `initialAtoms`. */
const correlationTimeFilterAtom: TimeFilterAtom = atom<TimeFilterParams | null>(
  null
);
const correlationProjectFilterAtom: ProjectFilterAtom =
  atom<ProjectFilterValue>(null);

/** The chart is wide, so it takes the page: a small inset map by default, or
 * the map and details as a sidebar. */
const correlationCapabilities: Partial<LayoutCapabilities> = {
  modes: ["content-inset", "content-primary", "content-full"],
  defaultMode: "content-inset",
  hasAssistant: true,
  itemName: "Chart",
  // Viewport-locked; the chart pane is its own scroller
  contentScroll: "panel",
};

const PageWrapper = compose(
  DarkModeProvider,
  PatternProvider,
  OverlaysProvider,
  C(MacrostratDataProvider, { baseURL: apiV2Prefix })
);

export function Page() {
  const hashData = useMemo(getCorrelationHashParams, []);

  const setSelectedUnit = useCorrelationDiagramStore(
    (state) => state.setSelectedUnit
  );
  useEffect(() => {
    // Set the initial selected unit from the hash if available
    if (hashData.unit != null) {
      setSelectedUnit(hashData.unit, undefined);
    }
  }, []);

  const initialAtoms = useMemo(
    () =>
      [
        [correlationTimeFilterAtom, hashData.time ?? null],
        [correlationProjectFilterAtom, hashData.project_id ?? null],
      ] as [any, any][],
    []
  );

  // The map store spans every slot and reads the project filter, so it is
  // mounted inside the frame's scope rather than around it.
  const wrap = useMemo(
    () => (children: ReactNode) =>
      h(
        CorrelationStoreProvider,
        { section: hashData.section, columns: hashData.columns ?? null },
        children
      ),
    []
  );

  return h(
    PageWrapper,
    h(
      TimeFilterProvider,
      { atom: correlationTimeFilterAtom },
      h(
        ProjectFilterProvider,
        { atom: correlationProjectFilterAtom },
        h(HybridPage, {
          className: "correlation-page",
          capabilities: correlationCapabilities,
          initialAtoms,
          wrap,
          actions: h([
            h(ProjectFilterControl),
            h(SelectionModeControl),
            h(CorrelationSettingsButton),
          ]),
          filterBar: h([h(ProjectFilterTag), h(TimeFilterTag)]),
          content: h(CorrelationChartPane),
          map: h(CorrelationMapPane),
          assistant: h(CorrelationAssistantPane),
        })
      )
    )
  );
}

/** The map store, seeded from the hash and scoped to the project filter. The
 * footprints re-fetch when the project changes (a prop the store's effects
 * track); the selection itself is the store's from then on. */
function CorrelationStoreProvider({ section, columns, children }) {
  // Slugs resolved to the ids the API takes; `undefined` while resolving
  const projectIDs = useProjectIDs();
  let projectID: any = undefined;
  if (projectIDs != null) {
    projectID = projectIDParam(projectIDs);
  }
  return h(
    ColumnCorrelationProvider,
    {
      focusedLine: section,
      // An explicit column list (e.g. handed over from a column page) starts
      // the map in manual selection mode: columns are toggled by clicking.
      selectedColumns: columns,
      projectID,
    },
    children
  );
}

/* ------------------------------------------------------------------ the map */

function CorrelationMapPane() {
  const mode = useAtomValue(layoutModeAtom);
  let padding = 100;
  if (mode === "content-inset") {
    padding = 20;
  }
  return h(
    ColumnCorrelationMap,
    {
      accessToken: mapboxAccessToken,
      className: "correlation-map",
      showLogo: false,
      padding,
    },
    h(MapResizeOnToggle, { trigger: mode })
  );
}

/** Re-measure the map once it has loaded and whenever the layout mode moves it
 * between the inset and the sidebar. The map's own resize tracking didn't
 * reliably follow a class-driven size change, leaving the canvas at its
 * previous size. `useMapStyleOperator` waits for the map to exist; a resize
 * that already fits is a no-op. */
function MapResizeOnToggle({ trigger }: { trigger: string }) {
  useMapStyleOperator(
    (map) => {
      const frame = requestAnimationFrame(() => map.resize());
      return () => cancelAnimationFrame(frame);
    },
    [trigger]
  );
  return null;
}

/* ---------------------------------------------------------------- the chart */

/** The focused columns' ids. `useFocusedColumns` recomputes only when the
 * footprints, the selection or the line change, so this is a stable key for
 * anything that should follow the selection. */
function useFocusedColumnIDs(): number[] {
  const focusedColumns = useFocusedColumns();
  return useMemo(
    () => focusedColumns.map((c) => c.properties.col_id),
    [focusedColumns]
  );
}

function CorrelationChartPane() {
  return h("div.chart-scroll", h(CorrelationDiagramWrapper));
}

function CorrelationDiagramWrapper() {
  const colIDs = useFocusedColumnIDs();

  const focusedLine = useCorrelationMapStore((state) => state.focusedLine);
  // The manual selection as the store holds it — not the resolved focused
  // columns, which are empty until the footprints have loaded and would wipe
  // `columns=` from a freshly opened link.
  const selectedColumns = useCorrelationMapStore(
    (state) => state.selectedColumns
  );
  const selectedUnitID = useCorrelationDiagramStore(
    (state) => state.selectedUnitID
  );
  const timeFilter = useAtomValue(correlationTimeFilterAtom);
  const projectFilter = useAtomValue(correlationProjectFilterAtom);

  useEffect(() => {
    // A manual selection is linkable as `columns=`; a line of section as
    // `section=`. The store holds exactly one of the two.
    setHashStringForCorrelation({
      section: focusedLine,
      columns: selectedColumns,
      unit: selectedUnitID,
      time: timeFilter,
      project_id: projectFilter,
    });
  }, [focusedLine, selectedColumns, selectedUnitID, timeFilter, projectFilter]);

  // selected unit management
  const onUnitSelected = useCorrelationDiagramStore(
    (state) => state.setSelectedUnit
  );

  const mode = useAtomValue(layoutModeAtom);
  // Details live in the sidebar when there is one; otherwise in a popover
  const showUnitPopover = mode !== "content-primary";

  const fetch = useMacrostratStore((state) => state.fetch);
  const columnUnits = useAsyncMemo(async () => {
    return await fetchUnits(colIDs, fetch);
  }, [colIDs]);

  // Age window driven by the shared time filter (full extent when unfiltered)
  const fullExtent = useMemo(
    () => ageExtentOfUnits(columnUnits),
    [columnUnits]
  );
  const timeWindow = useTimeFilterWindow({ fullExtent });

  // Narrowing the window expands the vertical scale slightly, and with few
  // units in view they share the chart height instead of drawing at the
  // chart's compact 10px default.
  const targetUnitHeight = useTargetUnitHeight(
    columnUnits,
    timeWindow.targetWindow,
    fullExtent,
    { base: 10, max: 60, fillHeight: 500 }
  );

  // Hovering a column highlights its footprint on the map; clicking its header
  // frames it there.
  const columnMapLink = useColumnMapLink();

  return h("div.correlation-diagram", [
    h(
      ErrorBoundary,
      h(OverlaysProvider, [
        h(CorrelationChart, {
          data: columnUnits,
          selectedUnit: null,
          onUnitSelected,
          showUnitPopover,
          collapseSmallUnconformities: true,
          columnHeaderComponent: CorrelationColumnHeader,
          targetUnitHeight,
          t_age: timeWindow.window?.t_age,
          b_age: timeWindow.window?.b_age,
          // A margin past an interval selection; none for explicit ages
          windowPadding: timeWindow.windowPadding,
          isTransitioning: timeWindow.isAnimating,
          hideLabelsWhileTransitioning: true,
          onClickTimescaleInterval: timeWindow.onClickTimescaleInterval,
          timescaleIntervalStyle: timeWindow.timescaleIntervalStyle,
          ...columnMapLink,
        }),
      ])
    ),
  ]);
}

/** Header above each chart column: its name (resolved by the chart), its id
 * linking to the column page, and a small × that drops the column from the
 * chart. Removing from a line of section converts the selection to a manual
 * one (the library's semantics), since a line can't describe an arbitrary
 * subset. */
function CorrelationColumnHeader({ columnID, columnName }: ColumnHeaderProps) {
  const removeColumn = useCorrelationMapStore((s) => s.removeColumn);
  return h("div.column-header", [
    h("span.column-name", columnName ?? `Column ${columnID}`),
    " ",
    h(
      "a.column-id-link",
      {
        href: `/columns/${columnID}`,
        title: "Open column page",
        // The header itself frames the column on the map
        onClick: (e) => e.stopPropagation(),
      },
      h(Identifier, { id: columnID, className: "column-id" })
    ),
    h(Button, {
      className: "remove-column",
      icon: "cross",
      minimal: true,
      small: true,
      title: "Remove column from chart",
      onClick(e) {
        e.stopPropagation();
        removeColumn(columnID);
      },
    }),
  ]);
}

/* ------------------------------------------------------------- the assistant */

function CorrelationAssistantPane() {
  const selectedUnit = useCorrelationDiagramStore(
    (state) => state.selectedUnit
  );
  // Unit details take the sidebar over from the column list
  if (selectedUnit != null) {
    return h(UnitDetailsCard, { unit: selectedUnit });
  }
  return h(ColumnSelectionList);
}

/** The selected unit's details, as a card. The panel resolves adjacent units'
 * names through the column state scope, so it is given the unit's column. */
function UnitDetailsCard({ unit }) {
  const setSelectedUnit = useCorrelationDiagramStore(
    (state) => state.setSelectedUnit
  );
  const fetch = useMacrostratStore((state) => state.fetch);
  const columnData = useAsyncMemo(async () => {
    if (unit?.col_id == null) return null;
    return await fetchUnits([unit.col_id], fetch);
  }, [unit?.col_id]);
  const units = columnData?.[0]?.units ?? [];

  return h(
    "div.unit-details-panel",
    h(
      MacrostratColumnStateProvider,
      { units },
      h(UnitDetailsPanel, {
        unit,
        onClose: () => setSelectedUnit(null),
      })
    )
  );
}

/** The chart's columns, in order — drag to reorder, × to remove; hovering
 * highlights the column on the map and clicking frames it. Reordering or
 * removing from a line-of-section selection converts it to a manual one, so
 * the list notes which mode is in play. */
function ColumnSelectionList() {
  const selectionMode = useSelectionMode();
  const ids = useFocusedColumnIDs();
  const setSelectedColumns = useCorrelationMapStore(
    (s) => s.setSelectedColumns
  );
  const removeColumn = useCorrelationMapStore((s) => s.removeColumn);
  const setHoveredColumn = useCorrelationMapStore((s) => s.setHoveredColumn);
  const zoomToColumn = useCorrelationMapStore((s) => s.zoomToColumn);

  let modeNote =
    "Manual selection: click columns on the map to add or remove them.";
  if (selectionMode === "line") {
    modeNote =
      "From the line of section. Reordering or removing a column switches to a manual selection.";
  }

  let body = null;
  if (ids.length === 0) {
    body = h(
      "p.selection-empty",
      "No columns yet. Click the map to draw a line of section, or click columns to select them."
    );
  } else {
    body = h(SortableItems, {
      ids,
      className: "column-selection-items",
      onReorder: (next) => setSelectedColumns(next as number[]),
      itemProps: (id) => ({
        className: "selection-item",
        onMouseEnter: () => setHoveredColumn(id as number),
        onMouseLeave: () => setHoveredColumn(null),
        onClick: () => zoomToColumn(id as number),
      }),
      renderItem: (id) =>
        h([
          h(SortableDragHandle),
          h(ColumnSelectionLabel, { colID: id as number }),
          h(Button, {
            icon: "cross",
            intent: Intent.DANGER,
            minimal: true,
            small: true,
            title: "Remove column",
            onClick(e) {
              e.stopPropagation();
              removeColumn(id as number);
            },
          }),
        ]),
    });
  }

  return h("div.column-selection-list", [
    h("h3", "Columns"),
    h("p.selection-note", modeNote),
    body,
  ]);
}

function ColumnSelectionLabel({ colID }: { colID: number }) {
  const info = useMacrostratColumnInfo(colID);
  return h("span.selection-label", [
    h("span.selection-name", info?.col_name ?? `Column ${colID}`),
    h(Identifier, { id: colID, className: "selection-id" }),
  ]);
}

/* ------------------------------------------------------- header controls */

/** Explicit switch between drawing a line of section and picking columns by
 * hand. To manual, the current columns seed the list; back to line clears the
 * selection so a new line can be drawn. */
function SelectionModeControl() {
  const selectionMode = useSelectionMode();
  const setSelectionMode = useCorrelationMapStore((s) => s.setSelectionMode);

  return h(SegmentedControl, {
    small: true,
    options: [
      { label: "Line of section", value: "line" },
      { label: "Pick columns", value: "manual" },
    ],
    value: selectionMode,
    onValueChange(value) {
      setSelectionMode(value as "line" | "manual");
    },
  });
}

function CorrelationSettingsButton() {
  return h(PopoverNext, {
    minimal: true,
    placement: "bottom-end",
    content: h(CorrelationSettings),
    renderTarget: ({ isOpen, ...targetProps }) =>
      h(Button, {
        ...targetProps,
        icon: "settings",
        minimal: true,
        small: true,
        active: isOpen,
        title: "Chart settings",
      }),
  });
}

function CorrelationSettings() {
  const colorize = useCorrelationDiagramStore((d) => d.colorizeUnits);
  const applySettings = useCorrelationDiagramStore((d) => d.applySettings);

  return h("div.correlation-settings.settings", [
    h("h3", "Settings"),
    h(DisplayDensitySelector),
    h(Switch, {
      label: "Colorize",
      isOn: colorize,
      alignIndicator: Alignment.RIGHT,
      onChange() {
        applySettings({ colorizeUnits: !colorize });
      },
    }),
    h("h3", "Time filter"),
    h(TimeFilterPanel),
  ]);
}

function DisplayDensitySelector() {
  const displayDensity = useCorrelationDiagramStore((d) => d.displayDensity);
  const applySettings = useCorrelationDiagramStore((d) => d.applySettings);
  const options = [
    { label: "Low", value: DisplayDensity.LOW },
    { label: "Medium", value: DisplayDensity.MEDIUM },
    { label: "High", value: DisplayDensity.HIGH },
  ];

  return h(
    FormGroup,
    { label: "Display density" },
    h(SegmentedControl, {
      options,
      value: displayDensity,
      onValueChange(value) {
        applySettings({ displayDensity: value });
      },
      small: true,
      defaultValue: DisplayDensity.MEDIUM,
    })
  );
}
