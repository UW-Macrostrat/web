import h from "@macrostrat/hyper";
import CesiumView, {
  SatelliteLayer,
  getInitialPosition,
  buildPositionHash,
  terrainProvider,
  DisplayQuality,
} from "@macrostrat/cesium-viewer";
import { useRef } from "react";
import { getHashString, setHashString } from "@macrostrat/ui-components";
import "@znemz/cesium-navigation/dist/index.css";

function MacrostratCesiumView(props) {
  return h("div.map-view", "Hello world");
}

function GlobeDevPage() {
  const initialPosition = useRef(getInitialPosition(getHashString()));

  return h(
    CesiumView,
    {
      terrainProvider,
      showInspector: true,
      flyTo: null,
      initialPosition: initialPosition.current,
      displayQuality: DisplayQuality.High,
      highResolution: false,
      showIonLogo: false,
      onViewChange(cpos) {
        setHashString(buildPositionHash(cpos.camera));
      },
    },
    [h(SatelliteLayer)]
  );
}

export default MacrostratCesiumView;
