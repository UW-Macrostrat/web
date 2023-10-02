// Import @types/cesium to use along with CesiumJS
//import VectorProvider from "@macrostrat/cesium-vector-provider";
import TerrainProvider from "@macrostrat/cesium-martini";
import { useRef } from "react";
import h from "@macrostrat/hyper";
import { ImageryLayer } from "resium";
import CesiumViewer, {
  DisplayQuality,
  MapboxLogo,
} from "@macrostrat/cesium-viewer";
import { MapboxImageryProvider } from "cesium";

// export function BaseLayer({ enabled = true, style, accessToken, ...rest }) {
//   const provider = useRef(
//     new VectorProvider({
//       style,
//       showCanvas: false,
//       maximumZoom: 15,
//       tileSize: 512,
//       accessToken,
//     })
//   );

//   return h(ImageryLayer, { imageryProvider: provider.current, ...rest });
// }

function buildSatelliteLayer({ accessToken }) {
  const provider = new MapboxImageryProvider({
    mapId: "mapbox.satellite",
    maximumLevel: 19,
    accessToken,
  });
  return provider;
}

const SatelliteLayer = (props) => {
  const { accessToken, ...rest } = props;
  let satellite = useRef(buildSatelliteLayer({ accessToken }));

  return h(ImageryLayer, { imageryProvider: satellite.current, ...rest });
};

function CesiumView({ style, accessToken, ...rest }) {
  const terrainProvider = useRef(
    new TerrainProvider({
      hasVertexNormals: false,
      hasWaterMask: false,
      accessToken,
      highResolution: true,
      skipZoomLevels: (z) => z % 3 != 0,
      credit: "Mapbox",
    })
  );

  return h(
    CesiumViewer,
    {
      terrainProvider: terrainProvider.current,
      displayQuality: DisplayQuality.High,
      fogDensity: 0.0002,
      //skyBox: true,
      showInspector: true,
      showIonLogo: false,
      ...rest,
    },
    [h(SatelliteLayer, { accessToken }), h(MapboxLogo)]
  );
}

export default CesiumView;
