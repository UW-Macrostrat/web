import hyper from "@macrostrat/hyper";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { MapChangeTracker, MapClickHandler } from "@macrostrat/cesium-viewer";
import { Resource } from "cesium";
//import { GeologyLayer } from "@macrostrat/cesium-viewer/src/layers";
import CesiumView, {
  DisplayQuality,
  SatelliteLayer,
  terrainProvider,
  buildPositionHash,
  getInitialPosition,
} from "@macrostrat/cesium-viewer";
import { ImageryLayer } from "resium";
import { useMemo, useRef } from "react";
import VectorProvider from "@macrostrat/cesium-vector-provider";
import reliefShading from "./map-styles/relief-shading";
import {
  getHashString,
  setHashString,
} from "@macrostrat/ui-components/util/query-string";
import { useAppActions, MapLayer, useAppState } from "../app-state";
import { useCallback } from "react";
import styles from "./main.module.styl";
import { ErrorBoundary } from "@macrostrat/ui-components";
import {
  flyToParams,
  translateCameraPosition,
} from "@macrostrat/cesium-viewer";
import {
  BaseLayer,
  createSkuToken,
} from "cesium-vector-provider-standalone-example/src/main";
import {
  MartiniTerrainProvider,
  MapboxTerrainResource,
} from "@macrostrat/cesium-martini";

const Cesium = require("cesiumSource/Cesium");
import "cesium/../../Build/Cesium/Widgets/widgets.css";
import "@znemz/cesium-navigation/dist/index.css";

import { SETTINGS } from "../settings";
import { buildXRayStyle } from "./map-style";
import { useBaseMapStyle } from "./map-view/style-helpers";

const h = hyper.styled(styles);

// , //

const VectorGeologyLayer = ({ enabled = true, ...rest }) => {
  const provider = useRef(
    new VectorProvider({
      style: buildXRayStyle({}),
      // "mapbox://styles/jczaplewski/ckxeiii3a1jv415o8rxvgqlpd", //
      maximumZoom: 15,
      tileSize: 512,
      showCanvas: false,
      //opacity: 0.5,
      accessToken: SETTINGS.mapboxAccessToken,
    })
  );

  //if (!enabled) return null;

  return h(ImageryLayer, { imageryProvider: provider.current, ...rest });
};

// const _GeologyLayer = ({ visibleMaps = null, ...rest }) => {
//   const hasGeology = useAppState((state) =>
//     state.core.mapLayers.has(MapLayer.BEDROCK)
//   );
//   return h(GeologyLayer, { enabled: true, ...rest });
// };

function MacrostratSatelliteLayer() {
  const hasSatellite = useAppState((state) =>
    state.core.mapLayers.has(MapLayer.SATELLITE)
  );
  if (!hasSatellite) return null;
  return h(SatelliteLayer);
}

// function BaseLayer({ enabled = true, style, ...rest }) {
//   const provider = useRef(
//     new VectorProvider({
//       style: "mapbox://styles/jczaplewski/cklb8aopu2cnv18mpxwfn7c9n",
//       showCanvas: false,
//       maximumZoom: 15,
//       tileSize: 512,
//       accessToken: SETTINGS.mapboxAccessToken,
//     })
//   );

//   return h(ImageryLayer, { imageryProvider: provider.current, ...rest });
// }

//   const provider = useMemo(() => {
//     return new VectorProvider({
//       style: reliefShading,
//       // "mapbox://styles/jczaplewski/ckxeiii3a1jv415o8rxvgqlpd", //
//       maximumZoom: 15,
//       tileSize: 512,
//       accessToken: SETTINGS.mapboxAccessToken,
//       showCanvas: true,
//     });
//   }, [enabled, style]);

//   if (!enabled) return null;

//   return h(ImageryLayer, { imageryProvider: provider, ...rest });
// }

export class MapboxTerrainResource2 extends MapboxTerrainResource {
  resource: Resource = null;

  constructor(opts = {}) {
    super(opts);

    // overrides based on highResolution flag
    this.maxZoom = 14;
    this.tileSize = 512;

    this.resource = Resource.createIfNeeded(
      `https://api.mapbox.com/raster/v1/mapbox.mapbox-terrain-dem-v1/{z}/{x}/{y}.png`
    );
    if (opts.accessToken) {
      this.resource.setQueryParameters({
        access_token: opts.accessToken,
        sku: createSkuToken().token,
      });
    }
  }
}

const resource = new MapboxTerrainResource2({
  accessToken: SETTINGS.mapboxAccessToken,
});

function MacrostratCesiumView(props) {
  const runAction = useAppActions();
  const terrainExaggeration =
    useAppState((state) => state.globe.verticalExaggeration) ?? 1.00001;
  const displayQuality = useAppState((state) => state.globe.displayQuality);
  const pos = useAppState((state) => state.core.mapPosition);

  const showInspector = false; //useAppState((state) => state.globe.showInspector);
  const hasSatellite = useAppState((state) =>
    state.core.mapLayers.has(MapLayer.SATELLITE)
  );
  const mapIsLoading = useAppState((state) => state.core.mapIsLoading);

  const bedrockShown = useAppState((state) =>
    state.core.mapLayers.has(MapLayer.BEDROCK)
  );

  // Only use initial position
  const [flyTo, setFlyTo] = useState({
    ...flyToParams(translateCameraPosition(pos)),
    duration: 0,
  });

  const baseMapURL = useBaseMapStyle().replace("?optimize=true", "");

  const terrain = useRef(new MartiniTerrainProvider({ resource }));

  const onTileLoadEvent = useCallback(
    (count) => {
      if (count > 0 && !mapIsLoading) {
        runAction({
          type: "map-loading",
        });
      }
      if (count === 0) {
        runAction({
          type: "map-idle",
        });
      }
    },
    [mapIsLoading]
  );

  return h("div.map-view-container.main-view", [
    h("div.cesium-container", [
      h(ErrorBoundary, [
        h(
          CesiumView,
          {
            //full: true,
            onViewChange(cpos) {
              const { camera } = cpos;
              // Tamp down memory usage by clearing log statements
              //console.clear();
              runAction({
                type: "map-moved",
                data: {
                  mapPosition: {
                    camera: {
                      lng: camera.longitude,
                      lat: camera.latitude,
                      altitude: camera.height,
                      pitch: 90 + camera.pitch,
                      bearing: camera.heading,
                    },
                  },
                  infoMarkerFocus: null,
                },
              });
            },
            onClick({ latitude, longitude, zoom }) {
              //dispatch(queryMap(longitude, latitude, zoom, null));
            },
            onTileLoadEvent,
            terrainExaggeration,
            displayQuality,
            showInspector,
            terrainProvider: terrain.current,
            //initialPosition: flyTo.destination ?? initialPosition,
            flyTo,
            ...props,
          },
          [
            // "mapbox://styles/jczaplewski/ckxeiii3a1jv415o8rxvgqlpd"
            // h(BaseLayer, {
            //   style: baseMapURL,
            //   accessToken: SETTINGS.mapboxAccessToken,
            // }),
            //h.if(!hasSatellite)(HillshadeLayer),
            h(SatelliteLayer),
            // h.if(style != null)(BaseLayer, {
            //   alpha: 1,
            //   style, //"mapbox://styles/jczaplewski/ckxcu9zmu4aln14mfg4monlv3/draft",
            // }),
            //h(GeologyLayer, { alpha: 0.5 }),
            //h(VectorGeologyLayer),
          ]
        ),
      ]),
    ]),
  ]);
}

const initialPosition = getInitialPosition(getHashString());

export function GlobeDevPage() {
  return h(
    CesiumView,
    {
      terrainProvider,
      showInspector: true,
      flyTo: null,
      initialPosition,
      displayQuality: DisplayQuality.High,
      onViewChange(cpos) {
        setHashString(buildPositionHash(cpos.camera));
      },
    },
    [h(SatelliteLayer)]
  );
}

export default MacrostratCesiumView;
