import "cesiumSource/Widgets/widgets.css";
import * as Cesium from "cesiumSource/Cesium";
import { hyperStyled } from "@macrostrat/hyper";
import styles from "./main.styl";
const h = hyperStyled(styles);
import { GlobeViewer } from "./viewer";
import { GeologyLayer, SatelliteLayer, HillshadeLayer } from "./layers";
import { DisplayQuality } from "./actions";
import {
  MapClickHandler,
  SelectedPoint,
  MapChangeTracker,
  FlyToInitialPosition,
} from "./position";
import { Fog, Globe, Scene } from "resium";
import { useSelector } from "react-redux";
import { terrainProvider } from "./layers";

const CesiumView = (props) => {
  const exaggeration =
    useSelector((state) => state.globe.verticalExaggeration) ?? 1.0;
  const displayQuality = useSelector((state) => state.globe.displayQuality);

  const showInspector = useSelector((state) => state.globe.showInspector);

  return h(
    GlobeViewer,
    {
      terrainProvider,
      // not sure why we have to do this...
      terrainExaggeration: exaggeration,
      highResolution: displayQuality == DisplayQuality.High,
      skyBox: false,
      showInspector,
      //terrainShadows: Cesium.ShadowMode.ENABLED
    },
    [
      h(
        Globe,
        {
          baseColor: Cesium.Color.LIGHTGRAY,
          enableLighting: false,
          showGroundAtmosphere: true,
          maximumScreenSpaceError:
            displayQuality == DisplayQuality.High ? 2 : 3,
          //shadowMode: Cesium.ShadowMode.ENABLED
        },
        null
      ),
      h(Scene, { requestRenderMode: true }),
      h(MapChangeTracker),
      h(SatelliteLayer),
      h(HillshadeLayer),
      h(GeologyLayer, { alpha: 0.5 }),
      h(MapClickHandler),
      h(SelectedPoint),
      h(FlyToInitialPosition),
      h(Fog, { density: 1e-4 }),
    ]
  );
};

export default CesiumView;
