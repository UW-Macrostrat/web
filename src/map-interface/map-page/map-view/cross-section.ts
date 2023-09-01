import { useMapRef } from "@macrostrat/mapbox-react";
import { useEffect, useRef } from "react";
import { useAppState } from "~/map-interface/app-state";
import { LineString } from "geojson";

export function CrossSectionLine() {
  const mapRef = useMapRef();
  const crossSectionLine = useAppState((state) => state.core.crossSectionLine);
  const previousLine = useRef<LineString | null>(null);
  useEffect(() => {
    const map = mapRef.current;
    if (map == null) return;
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
      map.getSource("crossSectionEndpoints").setData({
        type: "FeatureCollection",
        features: [],
      });
      map.getSource("crossSectionLine").setData({
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

    map.getSource("crossSectionLine")?.setData({
      type: "GeometryCollection",
      geometries: lines,
    });
    map.getSource("crossSectionEndpoints")?.setData({
      type: "FeatureCollection",
      features: endpointFeatures,
    });
  }, [mapRef.current, crossSectionLine]);
  return null;
}
