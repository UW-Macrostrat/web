import { useEffect } from "react";
import { MapBottomControls } from "@macrostrat/map-interface";
import { LinkButton } from "#/map/map-interface/components/buttons";
import h from "../main.module.sass";

export function useElevationMarkerLocation(mapRef, elevationMarkerLocation) {
  // Handle elevation marker location
  useEffect(() => {
    const map = mapRef.current;
    if (map == null) return;
    if (elevationMarkerLocation == null) return;
    const src = map.getSource("elevationMarker");
    if (src == null) return;
    src.setData({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Point",
            coordinates: elevationMarkerLocation,
          },
        },
      ],
    });
  }, [mapRef, elevationMarkerLocation]);
}

export function OurMapBottomControls() {
  return h(MapBottomControls, [
    h(LinkButton, {
      className: "show-in-globe",
      icon: "globe",
      to: "/globe",
      small: true,
    }),
  ]);
}
