import { MapLayer } from "~/map-interface/app-state";
import { useEffect } from "react";
import { SETTINGS } from "../../settings";

export function useCrossSectionCursorLocation(
  mapRef,
  crossSectionCursorLocation
) {
  // Handle elevation marker location
  useEffect(() => {
    const map = mapRef.current;
    if (map == null) return;
    const src = map.getSource("elevationMarker");
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
  }, [mapRef, crossSectionCursorLocation]);
}

export function getBaseMapStyle(mapLayers, isDarkMode = false) {
  if (mapLayers.has(MapLayer.SATELLITE)) {
    return SETTINGS.satelliteMapURL;
  }
  if (isDarkMode) {
    return SETTINGS.darkMapURL;
  }
  return SETTINGS.baseMapURL;
}
