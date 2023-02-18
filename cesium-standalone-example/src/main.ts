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

const SKU_ID = "01";

export function createSkuToken() {
  // SKU_ID and TOKEN_VERSION are specified by an internal schema and should not change
  const TOKEN_VERSION = "1";
  const base62chars =
    "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  // sessionRandomizer is a randomized 10-digit base-62 number
  let sessionRandomizer = "";
  for (let i = 0; i < 10; i++) {
    sessionRandomizer += base62chars[Math.floor(Math.random() * 62)];
  }
  const expiration = 12 * 60 * 60 * 1000; // 12 hours
  const token = [TOKEN_VERSION, SKU_ID, sessionRandomizer].join("");
  const tokenExpiresAt = Date.now() + expiration;

  return { token, tokenExpiresAt };
}

function createMapboxSku() {
  const { token, tokenExpiresAt } = createSkuToken();
  window.mapboxSku = token;
  window.mapboxSkuExpiresAt = tokenExpiresAt;
}

class SessionVectorProvider extends VectorProvider {
  constructor(options) {
    super(options);
    createMapboxSku();
  }

  transformRequest(url, resourceType) {
    let { url: newURL } = super.transformRequest(url, resourceType);
    newURL += `&sku=${window.mapboxSku}`;
    return { url: newURL };
  }
}

export function BaseLayer({ enabled = true, style, accessToken, ...rest }) {
  const provider = useRef(
    new SessionVectorProvider({
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
