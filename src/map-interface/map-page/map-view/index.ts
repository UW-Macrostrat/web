import { useSelector } from "react-redux";
import { forwardRef, useRef } from "react";
import { useAppActions, MapPosition } from "~/map-interface/app-state";
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
    mapHasBedrock,
    mapHasLines,
    mapHasSatellite,
    mapHasColumns,
    mapHasFossils,
    mapCenter,
    elevationChartOpen,
    elevationData,
    elevationMarkerLocation,
    mapPosition,
    infoDrawerOpen,
    mapIsLoading,
  } = useSelector((state) => state.update);

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
    if (mapHasColumns) {
      runAction({ type: "get-filtered-columns" });
    }
  }, [filters]);

  return h(_Map, {
    filters,
    filteredColumns,
    mapHasBedrock,
    mapHasLines,
    mapHasSatellite,
    mapHasColumns,
    mapHasFossils,
    mapCenter,
    elevationChartOpen,
    elevationData,
    elevationMarkerLocation,
    mapPosition,
    infoDrawerOpen,
    runAction,
    mapIsLoading,
    mapRef,
    ...props,
  });
}

export default MapContainer;
