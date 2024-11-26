/**
 * A development interface for rendering Rockd "checkins" and StraboSpot "spots".
 */

import { mapboxAccessToken } from "@macrostrat-web/settings";
import { useRockdStraboSpotStyle } from "./map-style";
// Import other components
import mapboxgl from "mapbox-gl";
import { useCallback, useState, useEffect } from "react";
import {
  MapView,
  MapMarker,
  FloatingNavbar,
  MapAreaContainer,
  MapLoadingButton,
  PanelCard,
  FeatureSelectionHandler,
} from "@macrostrat/map-interface";
import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";
import { DetailsPanel, FeaturePanel } from "./details-panel";

const h = hyper.styled(styles);

mapboxgl.accessToken = mapboxAccessToken;

export function Page() {
  const style = useRockdStraboSpotStyle();

  const [isOpen, setOpen] = useState(true);

  const [inspectPosition, setInspectPosition] =
    useState<mapboxgl.LngLat | null>(null);

  const [data, setData] = useState(null);

  const onSelectPosition = useCallback((position: mapboxgl.LngLat) => {
    setInspectPosition(position);
  }, []);

  return h(
    MapAreaContainer,
    {
      navbar: h(FloatingNavbar, {
        rightElement: h(MapLoadingButton, {
          active: isOpen,
          onClick: () => setOpen(!isOpen),
        }),
        title: "Rockd + StraboSpot",
      }),
      contextPanel: h(PanelCard, { className: "context-panel" }, [
        h("p", "Rockd Checkins and StraboSpot spots."),
      ]),
      detailPanel: h(DetailsPanel, {
        position: inspectPosition,
        onClose() {
          setInspectPosition(null);
        },
        nearbyFeatures: data,
      }),
      contextPanelOpen: isOpen,
    },
    h(
      MapView,
      {
        style,
        projection: { name: "globe" },
        mapboxToken: mapboxAccessToken,
        mapPosition: null, // Have to set map position to null for bounds to work
        bounds: [-125, 24, -66, 49],
      },
      [
        h(FeatureSelectionHandler, {
          selectedLocation: inspectPosition,
          setFeatures: setData,
          radius: 6,
        }),
        h(MapMarker, {
          position: inspectPosition,
          setPosition: onSelectPosition,
        }),
      ]
    )
  );
}
