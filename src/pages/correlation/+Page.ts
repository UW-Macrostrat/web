import { MapView } from "@macrostrat/map-interface";
import {
  MapboxMapProvider,
  useMapStyleOperator,
  useMapEaseTo,
} from "@macrostrat/mapbox-react";
import { LngLatBounds, GeoJSONSource } from "mapbox-gl";
import { FullscreenPage } from "~/layouts";
import h from "./main.module.sass";
import { baseMapURL, mapboxAccessToken } from "@macrostrat-web/settings";
import { PageBreadcrumbs } from "~/renderer";
import { FeatureCollection, LineString, Point } from "geojson";
import { useCallback, useMemo } from "react";
import { create } from "zustand";
import { buildCrossSectionLayers } from "../map/map-interface/map-page/map-styles";

interface CorrelationState {
  focusedLine: LineString | null;
  onClickMap: (point: Point) => void;
}

const useCorrelationDiagramStore = create<CorrelationState>((set) => ({
  focusedLine: null as LineString | null,
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
}));

export function Page() {
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
      ])
    ),
  ]);
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

function setGeoJSON(
  map: mapboxgl.Map,
  sourceID: string,
  data: FeatureCollection
) {
  let source = map.getSource(sourceID) as GeoJSONSource | null;
  if (source == null) {
    map.addSource(sourceID, { type: "geojson", data });
  } else {
    source.setData(data);
  }
}

function SectionLineManager() {
  const focusedLine = useCorrelationDiagramStore((state) => state.focusedLine);
  const onClickMap = useCorrelationDiagramStore((state) => state.onClickMap);

  const clickFn = useCallback(
    (e) => {
      onClickMap({ type: "Point", coordinates: e.lngLat.toArray() });
    },
    [onClickMap]
  );

  useMapStyleOperator(
    (map) => {
      map.on("click", clickFn);
      return () => {
        map.off("click", clickFn);
      };
    },
    [onClickMap]
  );

  const focusedLineSrc = useMemo(() => {
    if (focusedLine?.coordinates.length == 1) {
      return null;
    } else {
      return focusedLine;
    }
  }, [focusedLine]);

  return h(SectionLine, { focusedLine: focusedLineSrc });
}
