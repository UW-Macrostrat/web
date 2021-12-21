import { connect } from "react-redux";
import { mapMoved, resetPbdb } from "../../actions";
import { useAppActions } from "~/map-interface/reducers";
import Map from "./map";
import h from "@macrostrat/hyper";
import { useEffect } from "react";

// Convert to use hooks:
// https://betterprogramming.pub/convert-redux-to-hooks-d74d79b04f

const mapStateToProps = (state) => {
  return {
    filters: state.update.filters,
    filteredColumns: state.update.filteredColumns,
    mapHasBedrock: state.update.mapHasBedrock,
    mapHasLines: state.update.mapHasLines,
    mapHasSatellite: state.update.mapHasSatellite,
    mapHasColumns: state.update.mapHasColumns,
    mapHasFossils: state.update.mapHasFossils,
    mapCenter: state.update.mapCenter,
    elevationChartOpen: state.update.elevationChartOpen,
    elevationData: state.update.elevationData,
    elevationMarkerLocation: state.update.elevationMarkerLocation,
    mapXYZ: state.update.mapXYZ,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    resetPbdb: () => {
      dispatch(resetPbdb());
    },
    mapMoved: (data) => {
      dispatch(mapMoved(data));
    },
  };
};

function MapPropsContainer(props) {
  const runAction = useAppActions();

  useEffect(() => {
    if (props.mapHasColumns) {
      runAction({ type: "get-filtered-columns" });
    }
  }, [props.filters]);

  let mapProps = { ...props, runAction };
  return h(Map, { ...mapProps });
}

const MapContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(MapPropsContainer);

export default MapContainer;
