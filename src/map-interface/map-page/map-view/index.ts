import { useSelector } from "react-redux";
import { forwardRef, useRef } from "react";
import { useAppActions } from "~/map-interface/reducers";
import { MapPosition } from "~/map-interface/reducers/actions";
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
    // Update the URI when the map moves
    map.on("moveend", () => {
      runAction({
        type: "map-moved",
        data: buildMapPosition(map),
      });
    });
  }, [mapRef]);

  useEffect(() => {
    if (props.mapHasColumns) {
      runAction({ type: "get-filtered-columns" });
    }
  }, [props.filters]);

  console.log(mapPosition);

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
