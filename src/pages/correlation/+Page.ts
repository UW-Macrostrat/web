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
import { baseMapURL, mapboxAccessToken } from "@macrostrat-web/settings";
import { PageBreadcrumbs } from "~/renderer";
import { Feature, FeatureCollection, LineString, Point } from "geojson";
import { useEffect, useMemo } from "react";
import { create } from "zustand";
import { setGeoJSON } from "@macrostrat/mapbox-utils";
import { ColumnGeoJSONRecord } from "~/pages/map/map-interface/app-state/handlers/columns";
// Turf intersection
import { lineIntersect } from "@turf/line-intersect";
import { distance } from "@turf/distance";
import { nearestPointOnLine } from "@turf/nearest-point-on-line";
import { centroid } from "@turf/centroid";

import { buildCrossSectionLayers } from "~/_utils/map-layers";
import { fetchAllColumns } from "~/pages/map/map-interface/app-state/handlers/fetch";
import { getFocusedLineFromHashParams, HashStringManager } from "./hash-string";
import { Button } from "@blueprintjs/core";
import classNames from "classnames";

interface CorrelationState {
  focusedLine: LineString | null;
  columns: ColumnGeoJSONRecord[];
  focusedColumns: FocusedColumnGeoJSONRecord[];
  mapExpanded: boolean;
  onClickMap: (point: Point) => void;
  toggleMapExpanded: () => void;
  startup: () => Promise<void>;
}

/** Store management with Zustand.
 * This is a newer and somewhat more subtle approach than the Redux store
 * used in the mapping application.
 * */
const useCorrelationDiagramStore = create<CorrelationState>((set) => ({
  focusedLine: null as LineString | null,
  columns: [],
  focusedColumns: [],
  mapExpanded: false,
  toggleMapExpanded: () =>
    set((state) => ({ mapExpanded: !state.mapExpanded })),
  onClickMap: (point: Point) =>
    set((state) => {
      if (
        state.focusedLine == null ||
        state.focusedLine.coordinates.length == 2
      ) {
        return {
          ...state,
          focusedLine: { type: "LineString", coordinates: [point.coordinates] },
          focusedColumns: [],
        };
      } else {
        const focusedLine: LineString = {
          type: "LineString",
          coordinates: [...state.focusedLine.coordinates, point.coordinates],
        };

        return {
          ...state,
          focusedLine,
          focusedColumns: buildCorrelationColumns(state.columns, focusedLine),
        };
      }
    }),
  async startup() {
    const columns = await fetchAllColumns();
    const focusedLine = getFocusedLineFromHashParams();
    const focusedColumns = buildCorrelationColumns(columns, focusedLine);

    set({ columns, focusedLine, focusedColumns });
  },
}));

export function Page() {
  const startup = useCorrelationDiagramStore((state) => state.startup);
  useEffect(() => {
    startup();
  }, []);

  const focusedLine = useCorrelationDiagramStore((state) => state.focusedLine);

  return h(FullscreenPage, [
    h(HashStringManager, { focusedLine }),
    h("div.main-panel", [
      h("header", [h(PageBreadcrumbs)]),
      h("div.flex.row.diagram-container", [
        h("div.correlation-diagram"),
        h("div.assistant", [h(InsetMap)]),
      ]),
    ]),
  ]);
}

function InsetMap() {
  const focusedLine = useCorrelationDiagramStore((state) => state.focusedLine);
  const columns = useCorrelationDiagramStore((state) => state.columns);
  const expanded = useCorrelationDiagramStore((state) => state.mapExpanded);

  return h(
    "div.column-selection-map",
    { className: classNames({ expanded }) },
    [
      h(MapboxMapProvider, [
        h(MapExpandedButton),
        h(MapView, { style: baseMapURL, accessToken: mapboxAccessToken }, [
          h(MapClickHandler),
          h(SectionLine, { focusedLine }),
          h(ColumnsLayer, { columns }),
          h(SelectedColumnsLayer),
        ]),
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
      onClickMap({ type: "Point", coordinates: e.lngLat.toArray() });
    },
    [onClickMap]
  );

  return null;
}

function buildCorrelationColumns(
  columns: ColumnGeoJSONRecord[],
  line: LineString
): FocusedColumnGeoJSONRecord[] {
  let features = [];
  if (columns == null && line == null) {
    return [];
  }
  return orderColumnsByDistance(
    computeIntersectingColumns(columns, line),
    line
  );
}

function computeIntersectingColumns(
  columns: ColumnGeoJSONRecord[],
  line: LineString
): ColumnGeoJSONRecord[] {
  return columns.filter((col) => {
    const poly = col.geometry;
    const intersection = lineIntersect(line, poly);
    return intersection.features.length > 0;
  });
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

interface FocusedColumnGeoJSONRecord extends ColumnGeoJSONRecord {
  properties: {
    centroid: Point;
    nearestPointOnLine: Point;
    distanceAlongLine: number;
  } & ColumnGeoJSONRecord["properties"];
}

function orderColumnsByDistance(
  columns: ColumnGeoJSONRecord[],
  line: LineString
): FocusedColumnGeoJSONRecord[] {
  const centroids = columns.map((col) => centroid(col.geometry));
  const projectedPoints = centroids.map((point) =>
    nearestPointOnLine(line, point)
  );
  const distances = projectedPoints.map((point) =>
    distance(point.geometry.coordinates, line.coordinates[0])
  );

  let newColumns = columns.map((col, i) => {
    return {
      ...col,
      properties: {
        ...col.properties,
        centroid: centroids[i],
        nearestPointOnLine: projectedPoints[i],
        distanceAlongLine: distances[i],
      },
    };
  });

  return sorted(newColumns, (d) => d.properties.distanceAlongLine);
}

function sorted(data, accessor: (d) => number) {
  return data.sort((a, b) => accessor(a) - accessor(b));
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

  useMapEaseTo({ bounds, padding: 120 });

  return null;
}
