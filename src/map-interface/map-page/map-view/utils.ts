import { useRef } from "react";
import { useAppState, MapLayer } from "~/map-interface/app-state";
import { GeolocateControl } from "mapbox-gl";
import hyper from "@macrostrat/hyper";
import { useEffect } from "react";
import styles from "../main.module.styl";
import {
  CompassControl,
  GlobeControl,
  ThreeDControl,
  MapControlWrapper,
} from "@macrostrat/mapbox-react";
import classNames from "classnames";
import { mapViewInfo } from "@macrostrat/mapbox-utils";
import { SETTINGS } from "../../_settings";
import mapboxgl from "mapbox-gl";

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
