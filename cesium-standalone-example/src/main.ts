const Cesium = require("cesiumSource/Cesium");
// Import @types/cesium to use along with CesiumJS
import VectorProvider from "@macrostrat/cesium-vector-provider";
import TerrainProvider from "@macrostrat/cesium-martini";
import { useRef } from "react";
import h from "@macrostrat/hyper";
import { ImageryLayer } from "resium";
import CesiumViewer, {
  DisplayQuality,
  MapboxLogo,
} from "@macrostrat/cesium-viewer";
import "@macrostrat/cesium-viewer/dist/index.css";

export function BaseLayer({ enabled = true, style, accessToken, ...rest }) {
  const provider = useRef(
    new VectorProvider({
      style,
      showCanvas: false,
      maximumZoom: 15,
      tileSize: 512,
      accessToken,
    })
  );

  return h(ImageryLayer, { imageryProvider: provider.current, ...rest });
}

function CesiumView({ style, accessToken, ...rest }) {
  const terrainProvider = useRef(
    new TerrainProvider({
      hasVertexNormals: false,
      hasWaterMask: false,
      accessToken,
      highResolution: false,
      credit: "Mapbox",
    })
  );

  return h(
    CesiumViewer,
    {
      terrainProvider: terrainProvider.current,
      displayQuality: DisplayQuality.High,
      showInspector: true,
      showIonLogo: false,
      ...rest,
    },
    [h(BaseLayer, { style, accessToken }), h(MapboxLogo)]
  );
}

export default CesiumView;
