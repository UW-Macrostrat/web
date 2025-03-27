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
import { useEffect } from "react";
import { DisplayDensity, useCorrelationDiagramStore } from "./state";
import { PatternProvider } from "~/_providers";
import { useRef } from "react";

import { Button, OverlaysProvider } from "@blueprintjs/core";
import { CorrelationChart, useCorrelationChartData } from "./correlation-chart";
import { DarkModeProvider, ErrorBoundary } from "@macrostrat/ui-components";
import {
  ColumnCorrelationMap,
  ColumnCorrelationProvider,
} from "@macrostrat/column-views";
import {
  LithologiesProvider,
  UnitDetailsPanel,
  UnitSelectionProvider,
  useSelectedUnit,
} from "@macrostrat/column-views";
import { getCorrelationHashParams } from "#/columns/correlation/hash-string";

export function Page() {
  return h(PageWrapper, h(PageInner));
}

export function PageInner() {
  const startup = useCorrelationDiagramStore((state) => state.startup);

  useEffect(() => {
    const { section, unit } = getCorrelationHashParams();
    startup({ unit });
  }, []);

  const sectionLineRef = useEffect(() => {
    startup();
  }, []);

  const expanded = useCorrelationDiagramStore((state) => state.mapExpanded);
  const onSelectColumns = useCorrelationDiagramStore(
    (state) => state.onSelectColumns
  );
  const ref = useRef();

  return h(
    ColumnCorrelationProvider,
    {
      apiBaseURL: apiV2Prefix,
      line,
    },
    h("div.main-panel", { ref }, [
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
                onSelectColumns,
                padding: expanded ? 100 : 20,
                focusedLine: section,
              }),
              h(MapExpandedButton),
            ]),
            h(UnitDetailsExt),
          ]),
        ]
      ),
    ])
  );
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
  C(LithologiesProvider, { baseURL: apiV2Prefix }),
  UnitSelectionManager
);

function UnitSelectionManager({ children }) {
  const selectedUnit = useCorrelationDiagramStore(
    (state) => state.selectedUnit
  );
  const setSelectedUnit = useCorrelationDiagramStore(
    (state) => state.setSelectedUnit
  );

  return h(
    UnitSelectionProvider,
    {
      unit: selectedUnit,
      setUnit: setSelectedUnit,
    },
    children
  );
}

function UnitDetailsExt() {
  const selectedUnit = useSelectedUnit();
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

function CorrelationDiagramWrapper() {
  const chartData = useCorrelationChartData();

  return h("div.correlation-diagram", [
    h(
      ErrorBoundary,
      h(OverlaysProvider, [h(CorrelationChart, { data: chartData })])
    ),
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
