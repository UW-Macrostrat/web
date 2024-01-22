import { SETTINGS } from "@macrostrat-web/settings";
import hyper from "@macrostrat/hyper";
import {
  CompassControl,
  GlobeControl,
  MapControlWrapper,
  ThreeDControl,
  useMapRef,
} from "@macrostrat/mapbox-react";
import { mapViewInfo } from "@macrostrat/mapbox-utils";
import classNames from "classnames";
import mapboxgl, { GeolocateControl } from "mapbox-gl";
import { useEffect, useRef } from "react";
import {
  MapLayer,
  PositionFocusState,
  useAppState,
} from "~/pages/map/map-interface/app-state";
import { LinkButton } from "~/pages/map/map-interface/components/buttons";
import styles from "../main.module.styl";

const h = hyper.styled(styles);

function calcMapPadding(rect, childRect) {
  return {
    left: Math.max(rect.left - childRect.left, 0),
    top: Math.max(rect.top - childRect.top, 0),
    right: Math.max(childRect.right - rect.right, 0),
    bottom: Math.max(childRect.bottom - rect.bottom, 0),
  };
}

function ScaleControl(props) {
  const optionsRef = useRef({
    maxWidth: 200,
    unit: "metric",
  });
  return h(MapControlWrapper, {
    className: "map-scale-control",
    control: mapboxgl.ScaleControl,
    options: optionsRef.current,
    ...props,
  });
}

function GeolocationControl(props) {
  const optionsRef = useRef({
    showAccuracyCircle: true,
    showUserLocation: true,
    trackUserLocation: true,
    positionOptions: {
      enableHighAccuracy: true,
    },
  });
  return h(MapControlWrapper, {
    control: GeolocateControl,
    options: optionsRef.current,
    ...props,
  });
}

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

export function getMapPadding(ref, parentRef) {
  const rect = parentRef.current?.getBoundingClientRect();
  const childRect = ref.current?.getBoundingClientRect();
  if (rect == null || childRect == null) return;
  return calcMapPadding(rect, childRect);
}

export function MapBottomControls() {
  return h("div.map-controls", [
    h(ScaleControl),
    h(ThreeDControl, { className: "map-3d-control" }),
    h(CompassControl, { className: "compass-control" }),
    h(GlobeControl, { className: "globe-control" }),
    h(GeolocationControl, { className: "geolocation-control" }),
    h(LinkButton, {
      className: "show-in-globe",
      icon: "globe",
      to: "/globe",
      small: true,
    }),
  ]);
}

export function MapStyledContainer({ className, children }) {
  const mapPosition = useAppState((state) => state.core.mapPosition);
  if (mapPosition != null) {
    const { mapIsRotated, mapUse3D, mapIsGlobal } = mapViewInfo(mapPosition);
    className = classNames(className, {
      "map-is-rotated": mapIsRotated,
      "map-3d-available": mapUse3D,
      "map-is-global": mapIsGlobal,
    });
  }

  return h("div", { className }, children);
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

export function useMapMarker(mapRef, markerRef, markerPosition) {
  useEffect(() => {
    const map = mapRef.current;
    if (map == null) return;
    if (markerPosition == null) {
      markerRef.current?.remove();
      return;
    }
    const marker = markerRef.current ?? new mapboxgl.Marker();
    marker.setLngLat(markerPosition).addTo(map);
    markerRef.current = marker;
    return () => marker.remove();
  }, [mapRef.current, markerPosition]);
}

export function useMapEaseToCenter(padding) {
  const mapRef = useMapRef();
  const infoMarkerPosition = useAppState(
    (state) => state.core.infoMarkerPosition
  );

  const prevInfoMarkerPosition = useRef<any>(null);
  const prevPadding = useRef<any>(null);
  // Handle map position easing (for both map padding and markers)
  useEffect(() => {
    const map = mapRef.current;
    if (map == null) return;
    let opts = null;
    if (infoMarkerPosition != prevInfoMarkerPosition.current) {
      opts ??= {};
      opts.center = infoMarkerPosition;
    }
    if (padding != prevPadding.current) {
      opts ??= {};
      opts.padding = padding;
    }
    if (opts == null) return;
    opts.duration = 800;
    map.flyTo(opts);
    map.once("moveend", () => {
      /* Waiting until moveend to update the refs allows us to
      batch overlapping movements together, which increases UI
      smoothness when, e.g., flying to new panels */
      prevInfoMarkerPosition.current = infoMarkerPosition;
      prevPadding.current = padding;
    });
  }, [infoMarkerPosition, padding]);
}

function greatCircleDistance(
  l1: mapboxgl.LngLatLike,
  l2: mapboxgl.LngLatLike
): number {
  // get distance in radians between l1 and l2
  const dLon = ((l2[0] - l1[0]) * Math.PI) / 180;

  // Spherical law of cosines (accurate at large distances)
  const lat1 = (l1[1] * Math.PI) / 180;
  const lat2 = (l2[1] * Math.PI) / 180;
  return Math.acos(
    Math.sin(lat1) * Math.sin(lat2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.cos(dLon)
  );
}

export function getFocusState(
  map: mapboxgl.Map,
  location: mapboxgl.LngLatLike | null
): PositionFocusState | null {
  /** Determine whether the infomarker is positioned in the viewport */
  if (location == null) return null;

  const mapCenter = map.getCenter();

  const dist = greatCircleDistance(location, mapCenter);
  if (dist > Math.PI / 4) {
    return PositionFocusState.OFF_CENTER;
  } else if (dist > Math.PI / 2) {
    return PositionFocusState.OUT_OF_VIEW;
  }

  const markerPos = map.project(location);
  const mapPos = map.project(mapCenter);
  const dx = Math.abs(markerPos.x - mapPos.x);
  const dy = Math.abs(markerPos.y - mapPos.y);
  const padding = map.getPadding();
  let { width, height } = map.getCanvas();
  width /= 2;
  height /= 2;

  if (dx < 10 && dy < 10) {
    return PositionFocusState.CENTERED;
  }
  if (dx < 150 && dy < 150) {
    return PositionFocusState.NEAR_CENTER;
  }

  if (
    markerPos.x > padding.left &&
    markerPos.x < width - padding.right &&
    markerPos.y > padding.top &&
    markerPos.y < height - padding.bottom
  ) {
    return PositionFocusState.OFF_CENTER;
  }

  if (
    markerPos.x > 0 &&
    markerPos.x < width &&
    markerPos.y > 0 &&
    markerPos.y < height
  ) {
    return PositionFocusState.OUT_OF_PADDING;
  }
  return PositionFocusState.OUT_OF_VIEW;
}
