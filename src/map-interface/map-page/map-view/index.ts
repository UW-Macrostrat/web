import { forwardRef, RefObject, useRef } from "react";
import {
  useAppActions,
  useAppState,
  MapPosition,
  MapLayer,
} from "~/map-interface/app-state";
import Map from "./map";
import hyper from "@macrostrat/hyper";
import { useEffect } from "react";
import mapboxgl from "mapbox-gl";
import useResizeObserver from "use-resize-observer";
import styles from "../main.module.styl";
import { useMapRef, viewInfo, useMapElement } from "./context";
import { MapControlWrapper, ThreeDControl } from "./controls";
import { CompassControl, ZoomControl } from "mapbox-gl-controls";
import classNames from "classnames";
import { Icon } from "@blueprintjs/core";
import { debounce } from "lodash";

const h = hyper.styled(styles);

const _Map = forwardRef((props, ref) => h(Map, { ...props, ref }));

function buildMapPosition(map: mapboxgl.Map): MapPosition {
  const pos = map.getFreeCameraOptions();
  const cameraPos = pos.position.toLngLat();
  let center = map.getCenter();
  return {
    camera: {
      ...cameraPos,
      altitude: pos.position.toAltitude(),
      bearing: map.getBearing(),
      pitch: map.getPitch(),
    },
    target: {
      ...center,
      zoom: map.getZoom(),
    },
  };
}

function setMapPosition(map: mapboxgl.Map, pos: MapPosition) {
  const { pitch = 0, bearing = 0, altitude } = pos.camera;
  const zoom = pos.target?.zoom;
  if (zoom != null && altitude == null && pitch == 0 && bearing == 0) {
    const { lng, lat } = pos.target;
    map.setCenter([lng, lat]);
    map.setZoom(zoom);
  } else {
    const { altitude, lng, lat } = pos.camera;
    const cameraOptions = new mapboxgl.FreeCameraOptions(
      mapboxgl.MercatorCoordinate.fromLngLat({ lng, lat }, altitude),
      [0, 0, 0, 1]
    );
    cameraOptions.setPitchBearing(pitch, bearing);
    map.setFreeCameraOptions(cameraOptions);
  }
}

function calcMapPadding(rect, childRect) {
  return {
    left: Math.max(rect.left - childRect.left, 0),
    top: Math.max(rect.top - childRect.top, 0),
    right: Math.max(childRect.right - rect.right, 0),
    bottom: Math.max(childRect.bottom - rect.bottom, 0),
  };
}

function toggleMapLabelVisibility(map: mapboxgl.Map, visible: boolean) {
  // Disable labels on the map
  console.log("Toggling map visibility");
  for (let lyr of map.style.stylesheet.layers) {
    const isLabelLayer = lyr.layout?.["text-field"] != null;
    if (isLabelLayer) {
      map.setLayoutProperty(lyr.id, "visibility", visible ? "visible" : "none");
    }
  }
}

function useMapLabelVisibility(
  mapRef: RefObject<mapboxgl.Map>,
  mapShowLabels: boolean
) {
  // Labek visibility
  useEffect(() => {
    const map = mapRef.current;
    if (map?.style?.stylesheet == null) return;
    toggleMapLabelVisibility(map, mapShowLabels);
  }, [mapRef, mapShowLabels]);

  useEffect(() => {
    const map = mapRef.current;
    if (map == null) return;
    map.on("style.load", () => {
      toggleMapLabelVisibility(map, mapShowLabels);
    });
  }, [mapRef]);
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
  } = useAppState((state) => state.core);

  const runAction = useAppActions();
  const offset = useRef([0, 0]);

  const mapRef = useMapRef();

  const ref = useRef<HTMLDivElement>();
  const parentRef = useRef<HTMLDivElement>();

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
        data: buildMapPosition(map),
      });
    };
    map.on("moveend", debounce(mapMovedCallback, 100));
  }, [mapRef]);

  useEffect(() => {
    if (mapLayers.has(MapLayer.COLUMNS)) {
      runAction({ type: "get-filtered-columns" });
    }
    runAction({ type: "map-layers-changed", mapLayers });
  }, [filters, mapLayers]);

  useMapLabelVisibility(mapRef, mapShowLabels);

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

  const { mapUse3D, mapIsRotated } = viewInfo(mapPosition);

  return h("div.map-view-container.main-view", { ref: parentRef }, [
    h(_Map, {
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
  ]);
}

function MapGlobeControl() {
  const map = useMapElement();

  let mapIsGlobe = false;
  let proj = map?.getProjection().name;
  if (proj == "globe") {
    mapIsGlobe = true;
  }
  const nextProj = mapIsGlobe ? "mercator" : "globe";
  const icon = mapIsGlobe ? "map" : "globe";

  return h(
    "div.map-control.globe-control.mapboxgl-ctrl-group.mapboxgl-ctrl.mapbox-control",
    [
      h(
        "button.globe-control-button",
        {
          onClick() {
            if (map == null) return;
            map.setProjection(nextProj);
          },
        },
        h(Icon, { icon })
      ),
    ]
  );
}

export const MapZoomControl = () =>
  h(MapControlWrapper, { className: "zoom-control", control: ZoomControl });

export function MapBottomControls() {
  return h("div.map-controls", [
    h(MapControlWrapper, {
      className: "map-3d-control",
      control: ThreeDControl,
    }),
    h(MapControlWrapper, {
      className: "compass-control",
      control: CompassControl,
    }),
    h(MapGlobeControl),
  ]);
}

export function MapStyledContainer({ className, children }) {
  const { mapIsRotated, mapUse3D, mapIsGlobal } = viewInfo(
    useAppState((state) => state.core.mapPosition)
  );
  className = classNames(className, {
    "map-is-rotated": mapIsRotated,
    "map-3d-available": mapUse3D,
    "map-is-global": mapIsGlobal,
  });

  return h("div", { className }, children);
}

export * from "./context";
export default MapContainer;
