import { forwardRef, useRef } from "react";
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

function calcMarkerLoadOffset({ ref, parentRef }) {
  const rect = parentRef.current?.getBoundingClientRect();
  const childRect = ref.current?.getBoundingClientRect();
  const desiredCenterX = rect.left + rect.width / 2;
  const desiredCenterY = rect.top + rect.height / 2;
  const centerX = childRect.left + childRect.width / 2;
  const centerY = childRect.top + childRect.height / 2;
  if (rect && childRect) {
    // Build in some space for the marker itself
    return [desiredCenterX - centerX, desiredCenterY - centerY + 20];
  }
  return [0, 0];
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
  } = useAppState((state) => state.core);

  const runAction = useAppActions();
  const offset = useRef([0, 0]);

  const mapRef = useRef<mapboxgl.Map>();

  const ref = useRef<HTMLDivElement>();
  const parentRef = useRef<HTMLDivElement>();
  const { width, height } = useResizeObserver({ ref });

  useEffect(() => {
    // Get the current value of the map. Useful for gradually moving away
    // from class component
    console.log("Map was set up:", mapRef.current);
    const map = mapRef.current;
    if (map == null) return;

    setMapPosition(map, mapPosition);
    // Update the URI when the map moves
    map.on("moveend", () => {
      runAction({
        type: "map-moved",
        data: buildMapPosition(map),
      });
    });
  }, [mapRef]);

  useEffect(() => {
    if (mapLayers.has(MapLayer.COLUMNS)) {
      runAction({ type: "get-filtered-columns" });
    }
  }, [filters, mapLayers]);

  useEffect(() => {
    offset.current = calcMarkerLoadOffset({ ref, parentRef });
    mapRef.current?.resize();
  }, [mapRef, width, height]);

  // Switch to 3D mode at high zoom levels or with a rotated map
  const pitch = mapPosition.camera.pitch ?? 0;
  const bearing = mapPosition.camera.bearing ?? 0;
  const alt = mapPosition.camera.altitude;
  const mapIsRotated = pitch != 0 || bearing != 0;

  let mapUse3D = false;
  if (alt != null) {
    mapUse3D = (pitch > 0 && alt < 200000) || alt < 80000;
  }

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

export default MapContainer;
