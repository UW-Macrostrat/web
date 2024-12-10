/**
 * A development interface for rendering Rockd "checkins" and StraboSpot "spots".
 */

import { mapboxAccessToken } from "@macrostrat-web/settings";
import { getColors, useSavedLocationsStyle } from "./map-style";
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
import {
  AnyMapPosition,
  formatCoordForZoomLevel,
  MapPosition,
} from "@macrostrat/mapbox-utils";

const h = hyper.styled(styles);

mapboxgl.accessToken = mapboxAccessToken;

const baseURL = "/dev/map/saved-locations";

export function Page() {
  const [inspectPosition, onSelectPosition] = useMapLocationManager();

  const style = useSavedLocationsStyle();
  const inDarkMode = useInDarkMode();

  const [isOpen, setOpen] = useState(true);

  const [data, setData] = useState(null);


  return h(
    MapAreaContainer,
    {
      navbar: h(FloatingNavbar, {
        rightElement: h(MapLoadingButton, {
          active: isOpen,
          onClick: () => setOpen(!isOpen),
        }),
        title: "Saved locations",
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
        mapPosition: inspectPosition,
        bounds: [-125, 24, -66, 49],
        onMapMoved(pos, map) {
          setURL(inspectPosition, map);
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
          setPosition(pos, event, map) {
            onSelectPosition(pos, map);
          },
        }),
      ]
    )
  );
}

type PositionBuilder = (
  position: MapPosition | null,
  map: mapboxgl.Map | undefined
) => void;

function useMapLocationManager(): [MapPosition, PositionBuilder] {
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

  const [inspectPosition, setInspectPosition] =
    useState<mapboxgl.LngLat | null>(initialPosition);

  const onSelectPosition = useCallback(
    (position: mapboxgl.LngLat | null, map: mapboxgl.Map | undefined) => {
      setInspectPosition(position);
      setURL(position, map);
    },
    []
  );

  return [inspectPosition, onSelectPosition];
}

function setURL(position: mapboxgl.LngLat, map: mapboxgl.Map) {
  let newPathname = "/dev/map/saved-locations";
  let currentPathname = window.location.pathname;

  if (map != null && position != null) {
    const z = map.getZoom() ?? 7;
    const lng = formatCoordForZoomLevel(position.lng, z);
    const lat = formatCoordForZoomLevel(position.lat, z);
    newPathname += `/loc/${lng}/${lat}`;
  }
  newPathname += buildHashParams(map, position);
  console.log(currentPathname, newPathname);
  if (currentPathname !== newPathname) {
    history.replaceState({}, "", newPathname);
  }
}

function buildHashParams(map, selectedPosition) {
  if (selectedPosition == null) return "";
  const z = map.getZoom();
  // Parse hash and add zoom level
  let q = new URLSearchParams(window.location.hash.slice(1));
  q.set("z", z.toFixed(0));
  return "#" + q.toString();
}
