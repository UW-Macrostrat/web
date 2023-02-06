import { forwardRef, useRef, useState, useCallback } from "react";
import {
  useAppActions,
  useAppState,
  MapLayer,
  PositionFocusState,
} from "~/map-interface/app-state";
import Map from "./map";
import { enable3DTerrain } from "./terrain";
import { GeolocateControl } from "mapbox-gl";
import hyper from "@macrostrat/hyper";
import { useEffect, useMemo } from "react";
import useResizeObserver from "use-resize-observer";
import styles from "../main.module.styl";
import {
  useMapRef,
  CompassControl,
  GlobeControl,
  ThreeDControl,
  useMapConditionalStyle,
  useMapLabelVisibility,
  MapControlWrapper,
} from "@macrostrat/mapbox-react";
import classNames from "classnames";
import { debounce } from "underscore";
import { inDarkMode } from "@macrostrat/ui-components";
import {
  mapViewInfo,
  getMapPosition,
  setMapPosition,
  getMapboxStyle,
  mergeStyles,
  MapPosition,
} from "@macrostrat/mapbox-utils";
import { getExpressionForFilters } from "./filter-helpers";
import { MapSourcesLayer, mapStyle, toggleLineSymbols } from "../map-style";
import { SETTINGS } from "../../settings";
import mapboxgl from "mapbox-gl";
import { ColumnProperties } from "~/map-interface/app-state/handlers/columns";

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

export function getFocusState(
  map: mapboxgl.Map,
  location: mapboxgl.LngLatLike | null
): PositionFocusState | null {
  /** Determine whether the infomarker is positioned in the viewport */
  if (location == null) return null;

  const markerPos = map.project(location);
  const mapPos = map.project(map.getCenter());
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
