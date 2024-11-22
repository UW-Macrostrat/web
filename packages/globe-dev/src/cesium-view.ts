// Import @types/cesium to use along with CesiumJS
//import VectorProvider from "@macrostrat/cesium-vector-provider";
import TerrainProvider from "@macrostrat/cesium-martini";
import { useRef, useEffect } from "react";
import h from "@macrostrat/hyper";
import { ImageryLayer } from "resium";
import CesiumViewer, {
  DisplayQuality,
  MapboxLogo,
  SatelliteLayer,
  GeologyLayer,
} from "@macrostrat/cesium-viewer";
import { useCesium } from "resium";
import {
  MapboxImageryProvider,
  createGooglePhotorealistic3DTileset,
} from "cesium";
import { MapboxImageryProvider } from "cesium";
import { elevationLayerURL } from "@macrostrat-web/settings";

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

function CesiumView({
  style,
  showGeology,
  accessToken,
  showGoogleTiles,
  googleMapsAPIKey,
  ...rest
}) {
  const terrainProvider: any = useRef(
    new TerrainProvider({
      hasVertexNormals: false,
      hasWaterMask: false,
      accessToken,
      highResolution: true,
      skipZoomLevels: (z) => z % 3 != 0,
      credit: "Mapbox",
      urlTemplate: elevationLayerURL,
    })
  );

  if (showGoogleTiles) {
    // @ts-ignore
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
      [
        h(GooglePhotorealistic3DTileset, {
          googleMapsAPIKey,
        }),
      ]
    );
  }

  // @ts-ignore
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
    [
      h(SatelliteLayer, { accessToken, show: !showGoogleTiles }),
      h(GeologyLayer, { alpha: 0.3, show: showGeology && !showGoogleTiles }),
      h(MapboxLogo),
      // h(GooglePhotorealistic3DTileset, {
      //   googleMapsAPIKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
      //   show: showGoogleTiles,
      // }),
    ]
  );
}

// https://cesium.com/learn/cesiumjs-learn/cesiumjs-photorealistic-3d-tiles/
function GooglePhotorealistic3DTileset({ googleMapsAPIKey }) {
  const viewer = useCesium();
  const tileset = useRef(null);
  useEffect(() => {
    if (tileset.current != null) {
      viewer.scene.primitives.add(tileset.current);
    } else {
      createGooglePhotorealistic3DTileset(googleMapsAPIKey).then((ts) => {
        tileset.current = ts;
        viewer.scene.primitives.add(ts);
      });
    }
    return () => {
      viewer.scene.primitives.remove(tileset.current);
    };
  }, [googleMapsAPIKey, viewer]);
  return null;
}

export default CesiumView;
