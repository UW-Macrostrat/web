import { useSelector } from "react-redux";
import { forwardRef, useRef } from "react";
import { useAppActions } from "~/map-interface/reducers";
import Map from "./map";
import h from "@macrostrat/hyper";
import { useEffect } from "react";
import mapboxgl from "mapbox-gl";

const _Map = forwardRef((props, ref) => h(Map, { ...props, ref }));

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
    mapXYZ,
    infoDrawerOpen,
    mapIsLoading,
  } = useSelector((state) => state.update);

  const runAction = useAppActions();

  const mapRef = useRef<mapboxgl.Map>();

  useEffect(() => {
    // Get the current value of the map. Useful for gradually moving away
    // from class component
    console.log("Map was set up:", mapRef.current);
  }, [mapRef]);

  useEffect(() => {
    if (props.mapHasColumns) {
      runAction({ type: "get-filtered-columns" });
    }
  }, [props.filters]);

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
    mapXYZ,
    infoDrawerOpen,
    runAction,
    mapIsLoading,
    mapRef,
    ...props,
  });
}

export default MapContainer;
