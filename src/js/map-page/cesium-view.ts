import CesiumView from "@macrostrat/cesium-viewer/src";
import h from "@macrostrat/hyper";
import { useDispatch } from "react-redux";
import { queryMap, mapMoved } from "../actions";
import {
  MapChangeTracker,
  MapClickHandler,
} from "@macrostrat/cesium-viewer/src/position";

function MacrostratCesiumView(props) {
  const dispatch = useDispatch();

  return h(CesiumView, [
    h(MapClickHandler, {
      onClick({ latitude, longitude, zoom }) {
        dispatch(queryMap(longitude, latitude, 7, null));
      },
    }),
    h(MapChangeTracker, {
      onChange(cpos) {
        dispatch(mapMoved(cpos));
      },
    }),
  ]);
}

export default MacrostratCesiumView;
