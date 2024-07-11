import { useMapRef, useMapStatus } from "@macrostrat/mapbox-react";
import { useEffect, useRef } from "react";
import { useAppState } from "~/pages/map/map-interface/app-state";
import { LineString } from "geojson";
import { GeoJSONSource } from "mapbox-gl";

export function CrossSectionLine() {
  const crossSectionLine = useAppState((state) => state.core.crossSectionLine);
  const crossSectionCursor = useAppState(
    (state) => state.core.crossSectionCursorLocation
  );
  useCrossSectionCursorLocation(crossSectionCursor);
  useCrossSectionLine(crossSectionLine);

  return null;
}

export function useCrossSectionLine(crossSectionLine) {
  const mapRef = useMapRef();
  const previousLine = useRef<LineString | null>(null);
  const { isStyleLoaded } = useMapStatus();
  useEffect(() => {
    const map = mapRef.current;
    if (map == null || !isStyleLoaded) return;
    const endpointsSrc = map.getSource(
      "crossSectionEndpoints"
    ) as GeoJSONSource | null;
    const lineSrc = map.getSource("crossSectionLine") as GeoJSONSource | null;
    if (endpointsSrc == null || lineSrc == null) return;

    const coords = crossSectionLine?.coordinates ?? [];

    let lines = [];
    if (coords.length == 2 || crossSectionLine == null) {
      previousLine.current = crossSectionLine;
    }

    if (crossSectionLine != null) {
      lines.push(crossSectionLine);
    }

    if (previousLine.current != null) {
      // We are selecting a new line, and we should still show the previous line
      // until the new one is selected.
      lines.push(previousLine.current);
    }

    if (coords.length == 0) {
      // Reset the cross section line
      endpointsSrc.setData({
        type: "FeatureCollection",
        features: [],
      });
      lineSrc.setData({
        type: "FeatureCollection",
        features: [],
      });
      return;
    }

    let endpointFeatures = [];
    for (let line of lines) {
      for (let coord of line.coordinates) {
        endpointFeatures.push({
          type: "Feature",
          properties: {},
          geometry: {
            type: "Point",
            coordinates: coord,
          },
        });
      }
    }

    lineSrc.setData({
      type: "GeometryCollection",
      geometries: lines,
    });
    endpointsSrc.setData({
      type: "FeatureCollection",
      features: endpointFeatures,
    });
  }, [mapRef.current, crossSectionLine, isStyleLoaded]);
}

function useCrossSectionCursorLocation(crossSectionCursorLocation) {
  const mapRef = useMapRef();
  const { isStyleLoaded } = useMapStatus();

  // Handle elevation marker location
  useEffect(() => {
    const map = mapRef.current;
    if (map == null) return;
    const src = map.getSource("elevationMarker") as GeoJSONSource | null;
    if (src == null) return;
    if (crossSectionCursorLocation == null) {
      src.setData(null);
      return;
    }
    src.setData({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Point",
            coordinates: crossSectionCursorLocation,
          },
        },
      ],
    });
  }, [mapRef, crossSectionCursorLocation, isStyleLoaded]);
}
