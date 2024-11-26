/**
 * A development interface for rendering Rockd "checkins" and StraboSpot "spots".
 */

import h from "@macrostrat/hyper";
import { mapboxAccessToken } from "@macrostrat-web/settings";
import { useRockdStraboSpotStyle } from "./map-style";
// Import other components
import mapboxgl from "mapbox-gl";
import { useCallback, useState, useEffect } from "react";
import {
  MapView,
  MapMarker,
  LocationPanel,
  FloatingNavbar,
  MapAreaContainer,
  MapLoadingButton,
  PanelCard,
  FeaturePanel,
  FeatureSelectionHandler,
} from "@macrostrat/map-interface";

mapboxgl.accessToken = mapboxAccessToken;

export function Page() {
  const style = useRockdStraboSpotStyle();

  const [isOpen, setOpen] = useState(false);

  const [inspectPosition, setInspectPosition] =
    useState<mapboxgl.LngLat | null>(null);

  const [data, setData] = useState(null);

  const onSelectPosition = useCallback((position: mapboxgl.LngLat) => {
    setInspectPosition(position);
  }, []);

  let detailElement = null;
  if (inspectPosition != null) {
    detailElement = h(
      LocationPanel,
      {
        onClose() {
          setInspectPosition(null);
        },
        position: inspectPosition,
      },
      [
        h(FeaturePanel, {
          features: data,
          focusedSource: null,
          focusedSourceTitle: null,
        }),
      ]
    );
  }

  return h(
    MapAreaContainer,
    {
      navbar: h(FloatingNavbar, {
        rightElement: h(MapLoadingButton, {
          large: true,
          active: isOpen,
          onClick: () => setOpen(!isOpen),
          style: {
            marginRight: "-5px",
          },
        }),
        title: "Rockd + StraboSpot",
      }),
      contextPanel: h(PanelCard, [
        h("p", "This prototype shows Rockd Checkins and StraboSpot spots."),
      ]),
      detailPanel: detailElement,
      contextPanelOpen: isOpen,
    },
    h(
      MapView,
      {
        style,
        projection: { name: "globe" },
        mapboxToken: mapboxAccessToken,
        mapPosition: null,
        bounds: [-125, 24, -66, 49],
      },
      [
        h(FeatureSelectionHandler, {
          selectedLocation: inspectPosition,
          setFeatures: setData,
        }),
        h(MapMarker, {
          position: inspectPosition,
          setPosition: onSelectPosition,
        }),
      ]
    )
  );
}
