import { forwardRef, useRef } from "react";
import {
  useAppActions,
  useAppState,
  MapPosition,
  MapLayer,
} from "~/map-interface/app-state";
import Map from "./map";
import h from "@macrostrat/hyper";
import { useEffect } from "react";
import mapboxgl from "mapbox-gl";

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

  const mapRef = useRef<mapboxgl.Map>();

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

  // Switch to 3D mode at high zoom levels or with a rotated map
  const pitch = mapPosition.camera.pitch ?? 0;
  const bearing = mapPosition.camera.bearing ?? 0;
  const alt = mapPosition.camera.altitude;
  console.log(pitch, bearing, alt);
  const mapIsRotated = pitch != 0 || bearing != 0;
  const mapUse3D = (pitch > 0 && alt < 200000) || alt < 80000;

  return h(_Map, {
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
    ...props,
    use3D: mapUse3D,
  });
}

export default MapContainer;
