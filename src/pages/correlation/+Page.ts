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
import { FeatureCollection, LineString, Point } from "geojson";
import { useEffect, useMemo } from "react";
import { create } from "zustand";
import { setGeoJSON } from "@macrostrat/mapbox-utils";
import { ColumnGeoJSONRecord } from "~/pages/map/map-interface/app-state/handlers/columns";

import { buildCrossSectionLayers } from "~/_utils/map-layers";
import { fetchAllColumns } from "~/pages/map/map-interface/app-state/handlers/fetch";

interface CorrelationState {
  focusedLine: LineString | null;
  columns: ColumnGeoJSONRecord[];
  onClickMap: (point: Point) => void;
  startup: () => Promise<void>;
}

const useCorrelationDiagramStore = create<CorrelationState>((set) => ({
  focusedLine: null as LineString | null,
  columns: [],
  onClickMap: (point: Point) =>
    set((state) => {
      if (
        state.focusedLine == null ||
        state.focusedLine.coordinates.length == 2
      ) {
        return {
          ...state,
          focusedLine: { type: "LineString", coordinates: [point.coordinates] },
        };
      } else {
        return {
          ...state,
          focusedLine: {
            type: "LineString",
            coordinates: [...state.focusedLine.coordinates, point.coordinates],
          },
        };
      }
    }),
  async startup() {
    const columns = await fetchAllColumns();
    set({ columns });
  },
}));

export function Page() {
  const startup = useCorrelationDiagramStore((state) => state.startup);
  useEffect(() => {
    startup();
  }, []);

  return h(FullscreenPage, [
    h("header", [h(PageBreadcrumbs)]),
    h("div.flex.row", [
      h("div.correlation-diagram"),
      h("div.assistant", [h(InsetMap)]),
    ]),
  ]);
}

function InsetMap() {
  return h("div.column-selection-map", [
    h(
      MapboxMapProvider,
      h(MapView, { style: baseMapURL, accessToken: mapboxAccessToken }, [
        h(SectionLineManager),
        h(ColumnsLayer),
      ])
    ),
  ]);
}

function ColumnsLayer({ enabled = true }) {
  const columns = useCorrelationDiagramStore((state) => state.columns);

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

function SectionLineManager() {
  const focusedLine = useCorrelationDiagramStore((state) => state.focusedLine);
  const onClickMap = useCorrelationDiagramStore((state) => state.onClickMap);

  useMapClickHandler(
    (e) => {
      onClickMap({ type: "Point", coordinates: e.lngLat.toArray() });
    },
    [onClickMap]
  );

  return h(SectionLine, { focusedLine });
}
