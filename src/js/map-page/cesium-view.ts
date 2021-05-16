import CesiumView from "@macrostrat/cesium-viewer";
import h from "@macrostrat/hyper";
import { useDispatch, useSelector } from "react-redux";
import { queryMap, mapMoved } from "../actions";
import {
  MapChangeTracker,
  MapClickHandler,
} from "@macrostrat/cesium-viewer/position";

function MacrostratCesiumView(props) {
  const dispatch = useDispatch();
  const terrainExaggeration =
    useSelector((state) => state.globe.verticalExaggeration) ?? 1.0;
  const displayQuality = useSelector((state) => state.globe.displayQuality);

  const showInspector = useSelector((state) => state.globe.showInspector);

  return h(CesiumView, {
    onViewChange(cpos) {
      dispatch(mapMoved(cpos));
    },
    onClick({ latitude, longitude, zoom }) {
      dispatch(queryMap(longitude, latitude, zoom, null));
    },
    terrainExaggeration,
    displayQuality,
    showInspector,
  });
}

export default MacrostratCesiumView;
