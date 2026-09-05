import { FullscreenPage } from "~/layouts";
import { C } from "@macrostrat/hyper";
import h from "./main.module.sass";
import { compose } from "@macrostrat/hyper";
import { mapboxAccessToken, apiV2Prefix } from "@macrostrat-web/settings";
import {
  Alignment,
  FormGroup,
  Intent,
  PopoverNext,
  SegmentedControl,
  Switch,
} from "@blueprintjs/core";
import { PageBreadcrumbs } from "~/components";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { DisplayDensity, useCorrelationDiagramStore } from "./state";
import { PatternProvider } from "~/_providers";
import { useRef } from "react";

import { Button, OverlaysProvider } from "@blueprintjs/core";
import { DarkModeProvider } from "@macrostrat/ui-components";
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
  ColumnCorrelationMap,
  ColumnCorrelationProvider,
  useColumnMapLink,
  useCorrelationMapStore,
  UnitDetailsPanel,
  CorrelationChart,
  CorrelationChartProps,
  type ColumnHeaderProps,
} from "@macrostrat/column-views";
import { useMapStyleOperator } from "@macrostrat/mapbox-react";
import {
  getCorrelationHashParams,
  setHashStringForCorrelation,
} from "./hash-string";

import { ErrorBoundary, useAsyncMemo } from "@macrostrat/ui-components";
import { atom, useAtomValue, useSetAtom } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
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

/** The page's time filter, mirrored into the URL hash beside `section` and
 * `unit` by the existing hash writer below. */
const correlationTimeFilterAtom: TimeFilterAtom = atom<TimeFilterParams | null>(
  null
);

/** Page-level actions that need to reach inside the map provider's subtree. */
const CorrelationPageActions = createContext<{ resetToLineMode(): void }>({
  resetToLineMode() {},
});

export function Page() {
  const hashData = useMemo(getCorrelationHashParams, []);

  // What the map store is seeded with. Leaving manual mode for a fresh line of
  // section reseeds the provider (via `key`) with no selection: the installed
  // store has no action for that transition yet (`setSelectionMode` lands with
  // the atom-based store in map-views).
  const [seed, setSeed] = useState(() => ({
    section: hashData.section,
    columns: hashData.columns ?? null,
    key: 0,
  }));
  const actions = useMemo(
    () => ({
      resetToLineMode() {
        setSeed((prev) => ({ section: null, columns: null, key: prev.key + 1 }));
      },
    }),
    []
  );

  const setSelectedUnit = useCorrelationDiagramStore(
    (state) => state.setSelectedUnit
  );
  // Seed the time filter from the hash before the first render (so the hash
  // writer never sees an empty filter), and again on later mounts.
  useHydrateAtoms([[correlationTimeFilterAtom, hashData.time ?? null]]);
  const setTimeFilter = useSetAtom(correlationTimeFilterAtom);
  useEffect(() => {
    // Set the initial selected unit from the hash if available
    if (hashData.unit != null) {
      setSelectedUnit(hashData.unit, undefined);
    }
    setTimeFilter(hashData.time ?? null);
  }, []);

  return h(
    PageWrapper,
    h(
      ColumnCorrelationProvider,
      {
        key: seed.key,
        baseURL: apiV2Prefix,
        focusedLine: seed.section,
        // An explicit column list (e.g. handed over from a column page) starts
        // the map in manual selection mode: columns are toggled by clicking.
        selectedColumns: seed.columns,
      },
      h(
        CorrelationPageActions.Provider,
        { value: actions },
        h(
          TimeFilterProvider,
          { atom: correlationTimeFilterAtom },
          h(PageInner, { selectedUnit: hashData.unit })
        )
      )
    )
  );
}

function PageInner() {
  const expanded = useCorrelationDiagramStore((state) => state.mapExpanded);
  const ref = useRef();

  return h("div.main-panel", { ref }, [
    h("header.page-header", [
      h("div.header-row", [
        h(PageBreadcrumbs, { showLogo: true, separateTitle: false }),
        h("div.header-controls", [
          h(SelectionModeControl),
          h(CorrelationSettingsPopup, { boundary: ref.current }),
        ]),
      ]),
      // Active filters, above the content rather than beside the age axis
      h("div.header-filters", h(TimeFilterTag)),
    ]),
    h(
      "div.diagram-container",
      { className: expanded ? "map-expanded" : "map-inset" },
      [
        h("div.main-area", [
          h(CorrelationDiagramWrapper),
          h("div.overlay-safe-area"),
        ]),
        h("div.assistant", [
          h("div.column-selection-map", [
            h(
              ColumnCorrelationMap,
              {
                accessToken: mapboxAccessToken,
                className: "correlation-map",
                apiBaseURL: apiV2Prefix,
                showLogo: false,
                padding: expanded ? 100 : 20,
              },
              h(MapResizeOnToggle, { trigger: expanded })
            ),
            h(MapExpandedButton),
          ]),
          h(ColumnSelectionList),
          h(UnitDetailsExt),
        ]),
      ]
    ),
  ]);
}

/** Re-measure the map once it has loaded and whenever the inset/expanded
 * toggle changes its container. The map's own resize tracking didn't reliably
 * follow this class-driven size change, leaving the canvas at its previous size
 * with the columns drawn into a corner of the expanded box (or clipped in the
 * inset). `useMapStyleOperator` waits for the map to exist, so this also covers
 * a map created before its box had settled. A resize that fits is a no-op. */
function MapResizeOnToggle({ trigger }: { trigger: boolean }) {
  useMapStyleOperator(
    (map) => {
      const frame = requestAnimationFrame(() => map.resize());
      return () => cancelAnimationFrame(frame);
    },
    [trigger]
  );
  return null;
}

function CorrelationDiagramWrapper(props: Omit<CorrelationChartProps, "data">) {
  /** This state management is a bit too complicated, but it does kinda sorta work */

  // Sync focused columns with map
  const focusedColumns = useCorrelationMapStore(
    (state) => state.focusedColumns
  );

  const focusedLine = useCorrelationMapStore((state) => state.focusedLine);
  // The manual selection as the store holds it — not the resolved
  // `focusedColumns`, which is empty until the footprints have loaded and would
  // wipe `columns=` from a freshly opened link.
  const selectedColumns = useCorrelationMapStore(
    (state) => state.selectedColumns
  );
  const selectionMode = useCorrelationMapStore((state) => state.selectionMode);
  const selectedUnitID = useCorrelationDiagramStore(
    (state) => state.selectedUnitID
  );

  const timeFilter = useAtomValue(correlationTimeFilterAtom);

  useEffect(() => {
    // A manual selection is linkable as `columns=`; a line of section as
    // `section=`. The store holds exactly one of the two.
    setHashStringForCorrelation({
      section: focusedLine,
      columns: selectedColumns,
      unit: selectedUnitID,
      time: timeFilter,
    });
  }, [focusedLine, selectedColumns, selectedUnitID, timeFilter]);

  // selected unit management
  const onUnitSelected = useCorrelationDiagramStore(
    (state) => state.setSelectedUnit
  );

  const expanded = useCorrelationDiagramStore((state) => state.mapExpanded);

  const fetch = useMacrostratStore((state) => state.fetch);
  const columnUnits = useAsyncMemo(async () => {
    const col_ids = focusedColumns.map((col) => col.properties.col_id);
    return await fetchUnits(col_ids, fetch);
  }, [focusedColumns]);

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
          showUnitPopover: !expanded,
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
          ...props,
        }),
      ])
    ),
  ]);
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

function CorrelationSettingsPopup({ boundary }) {
  return h(PopoverNext, {
    content: h(CorrelationSettings),
    placement: "bottom-end",
    renderTarget: ({ isOpen, ...targetProps }) =>
      h(Button, {
        ...targetProps,
        icon: "settings",
        minimal: true,
        active: isOpen,
        title: "Chart settings",
      }),
  });
}

/** Header above each chart column: its name (resolved by the chart), its id,
 * and a small × that drops the column from the chart. Removing from a line of
 * section converts the selection to a manual one (the library's semantics),
 * since a line can't describe an arbitrary subset. */
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
        // The header itself frames the column on the map
        e.stopPropagation();
        removeColumn(columnID);
      },
    }),
  ]);
}

/** Explicit switch between drawing a line of section and picking columns by
 * hand. To manual, the current columns seed the list; to line, the selection
 * is cleared for a new line to be drawn. */
function SelectionModeControl() {
  const selectionMode = useCorrelationMapStore((s) => s.selectionMode);
  const focusedColumns = useCorrelationMapStore((s) => s.focusedColumns);
  const setSelectedColumns = useCorrelationMapStore(
    (s) => s.setSelectedColumns
  );
  const { resetToLineMode } = useContext(CorrelationPageActions);

  return h(SegmentedControl, {
    small: true,
    options: [
      { label: "Line of section", value: "line" },
      { label: "Pick columns", value: "manual" },
    ],
    value: selectionMode,
    onValueChange(value) {
      if (value === selectionMode) return;
      if (value === "manual") {
        setSelectedColumns(focusedColumns.map((c) => c.properties.col_id));
      } else {
        resetToLineMode();
      }
    },
  });
}

/** The chart's columns, in order — drag to reorder, × to remove; hovering
 * highlights the column on the map and clicking frames it. Shown with the map
 * expanded, unless a unit's details have taken that space. Reordering or
 * removing from a line-of-section selection converts it to a manual one, so
 * the list notes which mode is in play. */
function ColumnSelectionList() {
  const expanded = useCorrelationDiagramStore((state) => state.mapExpanded);
  const selectedUnit = useCorrelationDiagramStore((state) => state.selectedUnit);
  const selectionMode = useCorrelationMapStore((s) => s.selectionMode);
  const focusedColumns = useCorrelationMapStore((s) => s.focusedColumns);
  const setSelectedColumns = useCorrelationMapStore(
    (s) => s.setSelectedColumns
  );
  const removeColumn = useCorrelationMapStore((s) => s.removeColumn);
  const setHoveredColumn = useCorrelationMapStore((s) => s.setHoveredColumn);
  const zoomToColumn = useCorrelationMapStore((s) => s.zoomToColumn);

  if (!expanded || selectedUnit != null) return null;

  const ids = focusedColumns.map((c) => c.properties.col_id);

  let modeNote = "Manual selection: click columns on the map to add or remove them.";
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

const PageWrapper = compose(
  FullscreenPage,
  DarkModeProvider,
  PatternProvider,
  OverlaysProvider,
  C(MacrostratDataProvider, { baseURL: apiV2Prefix })
);

function UnitDetailsExt() {
  const selectedUnit = useCorrelationDiagramStore(
    (state) => state.selectedUnit
  );
  const expanded = useCorrelationDiagramStore((state) => state.mapExpanded);
  const setSelectedUnit = useCorrelationDiagramStore(
    (state) => state.setSelectedUnit
  );

  if (selectedUnit == null || !expanded) {
    return null;
  }

  return h("div.unit-details-panel", [
    h(UnitDetailsPanel, {
      unit: selectedUnit,
      onClose: () => setSelectedUnit(null),
    }),
  ]);
}

function MapExpandedButton() {
  const toggleMapExpanded = useCorrelationDiagramStore(
    (state) => state.toggleMapExpanded
  );
  const mapExpanded = useCorrelationDiagramStore((state) => state.mapExpanded);

  const icon = mapExpanded ? "collapse-all" : "expand-all";

  return h(Button, {
    className: "map-expanded-button",
    icon,
    onClick: toggleMapExpanded,
  });
}
