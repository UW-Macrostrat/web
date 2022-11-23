import { forwardRef, useRef, useState } from "react";
import {
  useAppActions,
  useAppState,
  MapLayer,
} from "~/map-interface/app-state";
import Map from "./map";
import { enable3DTerrain } from "./terrain";
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
} from "@macrostrat/mapbox-react";
import classNames from "classnames";
import { debounce } from "lodash";
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

function MapContainer(props) {
  const {
    filters,
    filteredColumns,
    mapLayers,
    mapCenter,
    elevationChartOpen,
    elevationData,
    elevationMarkerLocation,
    mapPosition,
    infoDrawerOpen,
    mapIsLoading,
    mapShowLabels,
    mapShowLineSymbols,
  } = useAppState((state) => state.core);

  const runAction = useAppActions();
  /* HACK: Right now we need this to force a render when the map
    is done loading
    */
  const [mapInitialized, setMapInitialized] = useState(false);
  const offset = useRef([0, 0]);

  let mapRef = useMapRef();

  const ref = useRef<HTMLDivElement>();
  const parentRef = useRef<HTMLDivElement>();
  const { mapUse3D, mapIsRotated } = mapViewInfo(mapPosition);

  const baseMapURL = mapLayers.has(MapLayer.SATELLITE)
    ? SETTINGS.satelliteMapURL
    : SETTINGS.baseMapURL;

  useEffect(() => {
    initializeMap(baseMapURL, mapLayers, mapPosition).then((map) => {
      mapRef.current = map;
      setMapInitialized(true);
    });
  }, []);
  useEffect(() => {
    if (mapRef.current == null) return;
    buildMapStyle(baseMapURL).then((style) => {
      console.log(style);
      mapRef.current.setStyle(style);
      enable3DTerrain(mapRef.current, mapUse3D);
    });
  }, [baseMapURL]);

  useEffect(() => {
    const map = mapRef.current;
    if (map == null) return;
    enable3DTerrain(map, mapUse3D);
  }, [mapRef.current, mapUse3D]);

  useEffect(() => {
    // Get the current value of the map. Useful for gradually moving away
    // from class component
    const map = mapRef.current;
    if (map == null) return;

    setMapPosition(map, mapPosition);
    // Update the URI when the map moves

    const mapMovedCallback = () => {
      runAction({
        type: "map-moved",
        data: getMapPosition(map),
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

  useMapLabelVisibility(mapRef, mapShowLabels);
  useMapConditionalStyle(
    mapRef,
    mapShowLineSymbols && mapLayers.has(MapLayer.LINES),
    toggleLineSymbols
  );

  useResizeObserver({
    ref: parentRef,
    onResize(sz) {
      const rect = parentRef.current?.getBoundingClientRect();
      const childRect = ref.current?.getBoundingClientRect();
      if (rect == null || childRect == null) return;
      const padding = calcMapPadding(rect, childRect);
      mapRef.current?.easeTo({ padding }, { duration: 800 });
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
      mapHasBedrock: mapLayers.has(MapLayer.BEDROCK),
      mapHasLines: mapLayers.has(MapLayer.LINES),
      mapHasSatellite: mapLayers.has(MapLayer.SATELLITE),
      mapHasColumns: mapLayers.has(MapLayer.COLUMNS),
      mapHasFossils: mapLayers.has(MapLayer.FOSSILS),
      mapCenter,
      elevationChartOpen,
      elevationData,
      elevationMarkerLocation,
      mapPosition,
      infoDrawerOpen,
      runAction,
      mapIsLoading,
      mapIsRotated,
      mapRef,
      markerLoadOffset: offset.current,
      ...props,
      use3D: mapUse3D,
      ref,
    }),
    h.if(mapLayers.has(MapLayer.SOURCES))(MapSourcesLayer),
  ]);
}

export function MapBottomControls() {
  return h("div.map-controls", [
    h(ThreeDControl, { className: "map-3d-control" }),
    h(CompassControl, { className: "compass-control" }),
    h(GlobeControl, { className: "globe-control" }),
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

export default MapContainer;
