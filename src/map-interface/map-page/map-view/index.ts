import { useSelector } from "react-redux";
import { useAppActions } from "~/map-interface/reducers";
import Map from "./map";
import h from "@macrostrat/hyper";
import { useEffect } from "react";

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

  useEffect(() => {
    if (props.mapHasColumns) {
      runAction({ type: "get-filtered-columns" });
    }
  }, [props.filters]);

  return h(Map, {
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
    ...props,
  });
}

export default MapContainer;
