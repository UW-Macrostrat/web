/**
 * A development interface for rendering Rockd "checkins" and StraboSpot "spots".
 */

import { mapboxAccessToken } from "@macrostrat-web/settings";
import { getColors, useRockdStraboSpotStyle } from "./map-style";
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
import { DetailsPanel } from "./details-panel";
import Legend from "./legend-text.mdx";
import { useInDarkMode } from "@macrostrat/ui-components";
import { usePageContext } from "vike-react/usePageContext";
import { navigate } from "vike/client/router";
import { formatCoordForZoomLevel } from "@macrostrat/mapbox-utils";

const h = hyper.styled(styles);

mapboxgl.accessToken = mapboxAccessToken;

const baseURL = "/dev/map/rockd-strabospot";

export function Page() {
  const { routeParams } = usePageContext();
  const { lng, lat } = routeParams;

  let initialPosition = null;
  if (lng != null && lat != null) {
    try {
      // Try to get the zoom level from the hash
      const q = new URLSearchParams(window.location.hash.slice(1));
      const zoom = q.has("z") ? parseInt(q.get("z")) : 7;

      initialPosition = { lng: parseFloat(lng), lat: parseFloat(lat), zoom };
    } catch {
      console.error("Failed to parse initial position");
    }
  }

  const style = useRockdStraboSpotStyle();
  const inDarkMode = useInDarkMode();

  const [isOpen, setOpen] = useState(true);

  const [inspectPosition, setInspectPosition] =
    useState<mapboxgl.LngLat | null>(initialPosition);

  const [data, setData] = useState(null);

  const onSelectPosition = useCallback(
    (
      position: mapboxgl.LngLat | null,
      event: Event | undefined,
      map: mapboxgl.Map | undefined
    ) => {
      setInspectPosition(position);
      let newPathname = "/dev/map/rockd-strabospot";
      let currentPathname = window.location.pathname;

      if (map != null && position != null) {
        const z = map.getZoom() ?? 7;
        const lng = formatCoordForZoomLevel(position.lng, z);
        const lat = formatCoordForZoomLevel(position.lat, z);
        newPathname += `/loc/${lng}/${lat}`;
      }
      newPathname += buildHashParams(map, position);
      if (currentPathname !== newPathname) {
        window.history.pushState({}, "", newPathname);
      }
    },
    []
  );

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
      contextPanel: h(
        PanelCard,
        { className: "context-panel" },
        h(Legend, {
          colors: getColors(inDarkMode),
        })
      ),
      detailPanel: h(DetailsPanel, {
        position: inspectPosition,
        onClose() {
          onSelectPosition(null, null, null);
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
        mapPosition: initialPosition,
        bounds: [-125, 24, -66, 49],
        onMapMoved(mapPosition, map) {
          window.location.hash = buildHashParams(map, inspectPosition);
        },
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

function buildHashParams(map, selectedPosition) {
  if (selectedPosition == null) return "";
  const z = map.getZoom();
  // Parse hash and add zoom level
  let q = new URLSearchParams(window.location.hash.slice(1));
  q.set("z", z.toFixed(0));
  return "#" + q.toString();
}
