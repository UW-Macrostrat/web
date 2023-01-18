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
import { useEffect } from "react";
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
} from "@macrostrat/mapbox-utils";
import { MapSourcesLayer, mapStyle, toggleLineSymbols } from "../map-style";
import { SETTINGS } from "../../Settings";
import mapboxgl, { MercatorCoordinate, FreeCameraOptions } from "mapbox-gl";

const h = hyper.styled(styles);

const VestigialMap = forwardRef((props, ref) => h(Map, { ...props, ref }));

function calcMapPadding(rect, childRect) {
  return {
    left: Math.max(rect.left - childRect.left, 0),
    top: Math.max(rect.top - childRect.top, 0),
    right: Math.max(childRect.right - rect.right, 0),
    bottom: Math.max(childRect.bottom - rect.bottom, 0),
  };
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

function useElevationMarkerLocation(mapRef, elevationMarkerLocation) {
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

async function buildMapStyle(baseMapURL) {
  const style = await getMapboxStyle(baseMapURL, {
    access_token: mapboxgl.accessToken,
  });
  return mergeStyles(style, mapStyle);
}

async function initializeMap(baseMapURL, mapLayers, mapPosition) {
  // setup the basic map
  mapboxgl.accessToken = SETTINGS.mapboxAccessToken;

  const map = new mapboxgl.Map({
    container: "map",
    style: await buildMapStyle(baseMapURL),
    maxZoom: 18,
    //maxTileCacheSize: 0,
    logoPosition: "bottom-left",
    trackResize: true,
    //antialias: true,
    optimizeForTerrain: true,
  });

  map.setProjection("globe");

  // set initial map position
  const pos = mapPosition;
  const { pitch = 0, bearing = 0, altitude } = pos.camera;
  const zoom = pos.target?.zoom;
  if (zoom != null && altitude == null) {
    const { lng, lat } = pos.target;
    map.setCenter([lng, lat]);
    map.setZoom(zoom);
  } else {
    const { altitude, lng, lat } = pos.camera;
    const cameraOptions = new FreeCameraOptions(
      MercatorCoordinate.fromLngLat({ lng, lat }, altitude),
      [0, 0, 0, 1]
    );
    cameraOptions.setPitchBearing(pitch, bearing);

    map.setFreeCameraOptions(cameraOptions);
  }

  return map;
}

function getMapPadding(ref, parentRef) {
  const rect = parentRef.current?.getBoundingClientRect();
  const childRect = ref.current?.getBoundingClientRect();
  if (rect == null || childRect == null) return;
  return calcMapPadding(rect, childRect);
}

function MapContainer(props) {
  const {
    filters,
    filteredColumns,
    mapLayers,
    mapCenter,
    elevationChartOpen,
    elevationData,
    elevationMarkerLocation,
    infoMarkerPosition,
    mapPosition,
    infoDrawerOpen,
    mapIsLoading,
    mapShowLineSymbols,
  } = useAppState((state) => state.core);

  const runAction = useAppActions();
  /* HACK: Right now we need this to force a render when the map
    is done loading
    */
  const [mapInitialized, setMapInitialized] = useState(false);

  let mapRef = useMapRef();

  const ref = useRef<HTMLDivElement>();
  const parentRef = useRef<HTMLDivElement>();
  const { mapUse3D, mapIsRotated } = mapViewInfo(mapPosition);

  const isDarkMode = inDarkMode();
  const baseMapURL = getBaseMapStyle(mapLayers, isDarkMode);

  const [padding, setPadding] = useState(getMapPadding(ref, parentRef));

  useEffect(() => {
    initializeMap(baseMapURL, mapLayers, mapPosition).then((map) => {
      mapRef.current = map;
      setMapInitialized(true);
    });
  }, []);

  useEffect(() => {
    if (mapRef.current == null) return;
    buildMapStyle(baseMapURL).then((style) => {
      mapRef.current.setStyle(style);
      enable3DTerrain(mapRef.current, mapUse3D);
    });
  }, [baseMapURL]);

  useEffect(() => {
    const map = mapRef.current;
    if (map == null) return;
    enable3DTerrain(map, mapUse3D);
  }, [mapRef.current, mapUse3D]);

  const markerRef = useRef(null);
  const handleMapQuery = useMapQueryHandler(mapRef, markerRef, infoDrawerOpen);

  // Handle map position easing (for both map padding and markers)
  useEffect(() => {
    mapRef.current?.easeTo({
      center: infoMarkerPosition,
      padding,
      duration: 800,
    });
  }, [infoMarkerPosition, padding]);

  useEffect(() => {
    // Get the current value of the map. Useful for gradually moving away
    // from class component
    const map = mapRef.current;
    if (map == null) return;

    setMapPosition(map, mapPosition);
    // Update the URI when the map moves

    const mapMovedCallback = (event) => {
      const marker = markerRef.current;
      const map = mapRef.current;

      let focusState = null;
      if (marker != null) {
        const markerPos = map.project(marker.getLngLat());
        const mapPos = map.project(map.getCenter());
        console.log(markerPos, mapPos);
      }

      runAction({
        type: "map-moved",
        position: getMapPosition(map),
        focusState: null,
      });
    };
    map.on("moveend", debounce(mapMovedCallback, 100));
  }, [mapRef.current, mapInitialized]);

  useEffect(() => {
    if (mapLayers.has(MapLayer.COLUMNS)) {
      runAction({ type: "get-filtered-columns" });
    }
    runAction({ type: "map-layers-changed", mapLayers });
  }, [filters, mapLayers]);

  useMapLabelVisibility(mapRef, mapLayers.has(MapLayer.LABELS));
  useEffect(() => {
    const map = mapRef.current;
    if (map == null) return;
    map.on("idle", () => {
      if (!mapIsLoading) return;
      runAction({ type: "map-idle" });
    });
  }, [mapRef.current, mapIsLoading]);

  useMapConditionalStyle(
    mapRef,
    mapShowLineSymbols && mapLayers.has(MapLayer.LINES),
    toggleLineSymbols
  );

  useResizeObserver({
    ref: parentRef,
    onResize(sz) {
      setPadding(getMapPadding(ref, parentRef));
    },
  });

  const debouncedResize = useRef(
    debounce(() => {
      mapRef.current?.resize();
    }, 100)
  );

  useResizeObserver({
    ref,
    onResize: debouncedResize.current,
  });

  useElevationMarkerLocation(mapRef, elevationMarkerLocation);

  const className = classNames({
    "is-rotated": mapIsRotated ?? false,
    "is-3d-available": mapUse3D ?? false,
  });

  return h("div.map-view-container.main-view", { ref: parentRef }, [
    h("div.mapbox-map#map", { ref, className }),
    h(VestigialMap, {
      filters,
      filteredColumns,
      // Recreate the set every time to force a re-render
      mapLayers,
      mapCenter,
      elevationChartOpen,
      elevationData,
      elevationMarkerLocation,
      mapPosition,
      mapIsLoading,
      mapIsRotated,
      onQueryMap: handleMapQuery,
      mapRef,
      isDark: isDarkMode,
      runAction,
      ...props,
      ref,
    }),
    h.if(mapLayers.has(MapLayer.SOURCES))(MapSourcesLayer),
  ]);
}

function useMapQueryHandler(
  mapRef: React.RefObject<mapboxgl.Map | null>,
  markerRef: React.RefObject<mapboxgl.Marker | null>,
  infoDrawerOpen: boolean
) {
  /** Handler for map query markers */
  const runAction = useAppActions();

  const handleMapQuery = useCallback(
    (event, columns = null) => {
      const column = columns?.[0];
      const map = mapRef.current;

      runAction({
        type: "map-query",
        lng: event.lngLat.lng,
        lat: event.lngLat.lat,
        z: map.getZoom(),
        column,
        map_id: null,
      });

      const marker =
        markerRef.current ?? new mapboxgl.Marker({ color: "#000000" });
      marker.setLngLat(event.lngLat).addTo(mapRef.current);
      markerRef.current = marker;
    },
    [mapRef, markerRef, infoDrawerOpen]
  );

  useEffect(() => {
    if (!infoDrawerOpen) {
      markerRef.current?.remove();
      markerRef.current = null;
    }
  }, [infoDrawerOpen]);

  return handleMapQuery;
}

export function MapBottomControls() {
  return h("div.map-controls", [
    h(ThreeDControl, { className: "map-3d-control" }),
    h(CompassControl, { className: "compass-control" }),
    h(GlobeControl, { className: "globe-control" }),
    h(GeolocationControl, { className: "geolocation-control" }),
  ]);
}

export function MapStyledContainer({ className, children }) {
  const { mapIsRotated, mapUse3D, mapIsGlobal } = mapViewInfo(
    useAppState((state) => state.core.mapPosition)
  );
  className = classNames(className, {
    "map-is-rotated": mapIsRotated,
    "map-3d-available": mapUse3D,
    "map-is-global": mapIsGlobal,
  });

  return h("div", { className }, children);
}

function getBaseMapStyle(mapLayers, isDarkMode = false) {
  if (mapLayers.has(MapLayer.SATELLITE)) {
    return SETTINGS.satelliteMapURL;
  }
  if (isDarkMode) {
    return SETTINGS.darkMapURL;
  }
  return SETTINGS.baseMapURL;
}

export default MapContainer;
