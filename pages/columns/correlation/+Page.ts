import { MapView } from "@macrostrat/map-interface";
import {
  MapboxMapProvider,
  useMapClickHandler,
  useMapEaseTo,
  useMapStyleOperator,
} from "@macrostrat/mapbox-react";
import { LngLatBounds } from "mapbox-gl";
import { FullscreenPage } from "~/layouts";
import h from "./main.module.sass";
import { compose, C } from "@macrostrat/hyper";
import { baseMapURL, mapboxAccessToken } from "@macrostrat-web/settings";
import { PageBreadcrumbs } from "~/components";
import { Feature, FeatureCollection, LineString, Point } from "geojson";
import { useEffect, useMemo } from "react";
import { setGeoJSON } from "@macrostrat/mapbox-utils";
import { useCorrelationDiagramStore } from "./state";
import { PatternProvider } from "~/_providers";

import { buildCrossSectionLayers } from "~/_utils/map-layers";
import { Button, OverlaysProvider } from "@blueprintjs/core";
import classNames from "classnames";
import { CorrelationChart } from "./correlation-chart";
import { DarkModeProvider } from "@macrostrat/ui-components";
import { ErrorBoundary } from "@macrostrat/ui-components";
import {
  UnitSelectionProvider,
  useSelectedUnit,
} from "@macrostrat/column-views";
import { UnitDescription } from "#/columns/correlation/column";

export function Page() {
  const startup = useCorrelationDiagramStore((state) => state.startup);
  useEffect(() => {
    startup();
  }, []);

  const expanded = useCorrelationDiagramStore((state) => state.mapExpanded);

  return h(PageWrapper, [
    h("header", [h(PageBreadcrumbs)]),
    h(
      "div.diagram-container",
      { className: expanded ? "map-expanded" : "map-inset" },
      [
        h("div.main-area", [
          h(CorrelationDiagramWrapper),
          h("div.overlay-safe-area"),
        ]),
        h("div.assistant", [h(InsetMap), h(UnitDetailsPanel)]),
      ]
    ),
  ]);
}

const PageWrapper = compose(
  FullscreenPage,
  DarkModeProvider,
  PatternProvider,
  UnitSelectionManager,
  ({ children }) => h("div.main-panel", children)
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

function UnitDetailsPanel() {
  const selectedUnit = useSelectedUnit();
  const expanded = useCorrelationDiagramStore((state) => state.mapExpanded);
  const setSelectedUnit = useCorrelationDiagramStore(
    (state) => state.setSelectedUnit
  );

  if (selectedUnit == null || !expanded) {
    return null;
  }

  return h("div.unit-details-panel", [
    h(UnitDescription, {
      unit: selectedUnit,
      onClose: () => setSelectedUnit(null),
    }),
  ]);
}

function CorrelationDiagramWrapper() {
  const chartData = useCorrelationDiagramStore((state) => state.chartData);

  return h("div.correlation-diagram", [
    h(
      ErrorBoundary,
      h(OverlaysProvider, [h(CorrelationChart, { data: chartData })])
    ),
  ]);
}

function InsetMap() {
  const focusedLine = useCorrelationDiagramStore((state) => state.focusedLine);
  const columns = useCorrelationDiagramStore((state) => state.columns);
  const expanded = useCorrelationDiagramStore((state) => state.mapExpanded);

  const padding = expanded ? 100 : 20;

  return h(
    "div.column-selection-map",
    { className: classNames({ expanded }) },
    [
      h(MapboxMapProvider, [
        h(MapExpandedButton),
        h(
          MapView,
          {
            style: baseMapURL,
            accessToken: mapboxAccessToken,
          },
          [
            h(MapClickHandler),
            h(SectionLine, { focusedLine, padding }),
            h(ColumnsLayer, { columns }),
            h(SelectedColumnsLayer),
          ]
        ),
      ]),
    ]
  );
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

function MapClickHandler() {
  const onClickMap = useCorrelationDiagramStore((state) => state.onClickMap);

  useMapClickHandler(
    (e) => {
      onClickMap(e, { type: "Point", coordinates: e.lngLat.toArray() });
    },
    [onClickMap]
  );

  return null;
}

function SelectedColumnsLayer({ columns, focusedLine }) {
  const focusedColumns = useCorrelationDiagramStore(
    (state) => state.focusedColumns
  );
  useMapStyleOperator(
    (map) => {
      let features = focusedColumns;

      const data: FeatureCollection = {
        type: "FeatureCollection",
        features,
      };

      const columnCentroidLine: Feature = {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: features.map(
            (col) => col.properties.centroid.geometry.coordinates
          ),
        },
        properties: {},
      };

      setGeoJSON(map, "selected-columns", data);
      setGeoJSON(map, "selected-column-centroids", {
        type: "FeatureCollection",
        features: [columnCentroidLine],
      });
    },
    [focusedColumns]
  );
  return null;
}

function ColumnsLayer({ columns, enabled = true }) {
  useMapStyleOperator(
    (map) => {
      if (columns == null) {
        return;
      }
      const data: FeatureCollection = {
        type: "FeatureCollection",
        features: columns,
      };
      const sourceID = "columns";
      setGeoJSON(map, sourceID, data);

      const columnLayers = buildColumnLayers(sourceID);
      for (let layer of columnLayers) {
        if (map.getSource(layer.source) == null) {
          continue;
        }
        if (map.getLayer(layer.id) == null) {
          map.addLayer(layer);
        }
      }
    },
    [columns, enabled]
  );
  return null;
}

function buildColumnLayers(sourceID: string) {
  return [
    {
      id: "selected-columns-fill",
      type: "fill",
      source: "selected-columns",
      paint: {
        "fill-color": "rgba(255, 0, 0, 0.1)",
      },
    },
    {
      id: "selected-column-centroids-line",
      type: "line",
      source: "selected-column-centroids",
      paint: {
        "line-color": "rgba(255, 0, 0, 0.8)",
        "line-width": 2,
        "line-dasharray": [2, 2],
      },
    },
    {
      id: "selected-column-centroids-points",
      type: "circle",
      source: "selected-column-centroids",
      paint: {
        "circle-radius": 4,
        "circle-color": "rgba(255, 0, 0, 0.8)",
      },
    },
    {
      id: "columns-fill",
      type: "fill",
      source: sourceID,
      paint: {
        "fill-color": "rgba(0, 0, 0, 0.1)",
      },
    },
    {
      id: "columns-line",
      type: "line",
      source: sourceID,
      paint: {
        "line-color": "rgba(0, 0, 0, 0.5)",
        "line-width": 1,
      },
    },
  ];
}

function SectionLine({ focusedLine }: { focusedLine: LineString }) {
  // Setup focused line
  useMapStyleOperator(
    (map) => {
      if (focusedLine == null) {
        return;
      }
      const data: FeatureCollection = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: focusedLine,
            properties: { id: "focusedLine" },
          },
        ],
      };

      setGeoJSON(map, "crossSectionLine", data);
      setGeoJSON(map, "crossSectionEndpoints", {
        type: "FeatureCollection",
        features: focusedLine.coordinates.map((coord) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: coord },
          properties: {},
        })),
      });

      // Add layers
      const layers = buildCrossSectionLayers();
      for (let layer of layers) {
        if (map.getSource(layer.source) == null) {
          continue;
        }
        if (map.getLayer(layer.id) == null) {
          map.addLayer(layer);
        }
      }
    },
    [focusedLine]
  );

  const bounds = useMemo(() => {
    if (focusedLine == null || focusedLine?.coordinates.length < 2) {
      return null;
    }
    let bounds = new LngLatBounds();
    for (let coord of focusedLine.coordinates) {
      bounds.extend(coord);
    }
    return bounds;
  }, [focusedLine]);

  useMapEaseTo({ bounds, padding: 50, trackResize: true });

  return null;
}
