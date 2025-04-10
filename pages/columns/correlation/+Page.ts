import { FullscreenPage } from "~/layouts";
import { C } from "@macrostrat/hyper";
import h from "./main.module.sass";
import { compose } from "@macrostrat/hyper";
import { mapboxAccessToken, apiV2Prefix } from "@macrostrat-web/settings";
import {
  Alignment,
  FormGroup,
  Popover,
  SegmentedControl,
  Switch,
} from "@blueprintjs/core";
import { PageBreadcrumbs } from "~/components";
import { useEffect, useMemo } from "react";
import { DisplayDensity, useCorrelationDiagramStore } from "./state";
import { PatternProvider } from "~/_providers";
import { useRef } from "react";

import { Button, OverlaysProvider } from "@blueprintjs/core";
import { DarkModeProvider } from "@macrostrat/ui-components";
import {
  ColumnCorrelationMap,
  ColumnCorrelationProvider,
  useCorrelationMapStore,
  MacrostratDataProvider,
  fetchUnits,
  UnitDetailsPanel,
  CorrelationChart,
  CorrelationChartProps,
  useMacrostratStore,
} from "@macrostrat/column-views";
import {
  getCorrelationHashParams,
  setHashStringForCorrelation,
} from "./hash-string";

import { ErrorBoundary, useAsyncMemo } from "@macrostrat/ui-components";

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

  return h(
    PageWrapper,
    h(
      ColumnCorrelationProvider,
      {
        baseURL: apiV2Prefix,
        focusedLine: hashData.section,
      },
      h(PageInner, { selectedUnit: hashData.unit })
    )
  );
}

export function PageInner() {
  const expanded = useCorrelationDiagramStore((state) => state.mapExpanded);
  const ref = useRef();

  return h("div.main-panel", { ref }, [
    h("header.page-header", [
      h(PageBreadcrumbs),
      h(CorrelationSettingsPopup, { boundary: ref.current }),
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
            h(ColumnCorrelationMap, {
              accessToken: mapboxAccessToken,
              className: "correlation-map",
              apiBaseURL: apiV2Prefix,
              showLogo: false,
              padding: expanded ? 100 : 20,
            }),
            h(MapExpandedButton),
          ]),
          h(UnitDetailsExt),
        ]),
      ]
    ),
  ]);
}

function CorrelationDiagramWrapper(props: Omit<CorrelationChartProps, "data">) {
  /** This state management is a bit too complicated, but it does kinda sorta work */

  // Sync focused columns with map
  const focusedColumns = useCorrelationMapStore(
    (state) => state.focusedColumns
  );

  const focusedLine = useCorrelationMapStore((state) => state.focusedLine);
  const selectedUnitID = useCorrelationDiagramStore(
    (state) => state.selectedUnitID
  );

  useEffect(() => {
    setHashStringForCorrelation({ section: focusedLine, unit: selectedUnitID });
  }, [focusedLine, selectedUnitID]);

  // selected unit management
  // const selectedUnit = useCorrelationDiagramStore(
  //   (state) => state.selectedUnit
  // );
  const onUnitSelected = useCorrelationDiagramStore(
    (state) => state.setSelectedUnit
  );

  const expanded = useCorrelationDiagramStore((state) => state.mapExpanded);

  const fetch = useMacrostratStore((state) => state.fetch);
  const columnUnits = useAsyncMemo(async () => {
    const col_ids = focusedColumns.map((col) => col.properties.col_id);
    return await fetchUnits(col_ids, fetch);
  }, [focusedColumns]);

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
  console.log("Boundary ref", boundary);
  return h(
    Popover,
    {
      content: h(CorrelationSettings),
    },
    h(Button, { icon: "settings", minimal: true })
  );
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
