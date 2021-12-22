import { useSelector } from "react-redux";
import { mapMoved, resetPbdb } from "../../actions";
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
    resetPbdb: () => {
      runAction(resetPbdb());
    },
    mapMoved: (data) => {
      runAction(mapMoved(data));
    },
    ...props,
  });
}

export default MapContainer;
