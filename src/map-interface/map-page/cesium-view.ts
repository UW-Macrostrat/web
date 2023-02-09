import hyper from "@macrostrat/hyper";
import { useDispatch, useSelector } from "react-redux";
import { MapChangeTracker, MapClickHandler } from "@macrostrat/cesium-viewer";
import {
  HillshadeLayer,
  GeologyLayer,
} from "@macrostrat/cesium-viewer/src/layers";
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

import "cesium/../../Build/Cesium/Widgets/widgets.css";
import "@znemz/cesium-navigation/dist/index.css";

const h = hyper.styled(styles);

// , //

const VectorGeologyLayer = ({ enabled = true, ...rest }) => {
  const provider = useRef(
    new VectorProvider({
      style: "mapbox://styles/jczaplewski/cklb8aopu2cnv18mpxwfn7c9n", //coreStyle,
      maximumZoom: 15,
      tileSize: 512,
      // showCanvas: true,
      //opacity: 0.5,
      accessToken:
        "pk.eyJ1IjoiamN6YXBsZXdza2kiLCJhIjoiY2szNXA5OWcxMDN2bzNtcnI1cWd1ZXJpYiJ9.Dd5GKlrPhg969y1ayY32cg",
    })
  );

  //if (!enabled) return null;

  return h(ImageryLayer, { imageryProvider: provider.current, ...rest });
};

const _GeologyLayer = ({ visibleMaps = null, ...rest }) => {
  const hasGeology = useAppState((state) =>
    state.core.mapLayers.has(MapLayer.BEDROCK)
  );
  return h(GeologyLayer, { enabled: true, ...rest });
};

function MacrostratSatelliteLayer() {
  const hasSatellite = useAppState((state) =>
    state.core.mapLayers.has(MapLayer.SATELLITE)
  );
  if (!hasSatellite) return null;
  return h(SatelliteLayer);
}

function BaseLayer({ enabled = true, style, ...rest }) {
  const provider = useMemo(() => {
    return new VectorProvider({
      style: reliefShading,
      // "mapbox://styles/jczaplewski/ckxeiii3a1jv415o8rxvgqlpd", //
      maximumZoom: 15,
      tileSize: 512,
    });
  }, [enabled, style]);

  if (!enabled) return null;

  return h(ImageryLayer, { imageryProvider: provider, ...rest });
}

function MacrostratCesiumView(props) {
  const runAction = useAppActions();
  const terrainExaggeration =
    useAppState((state) => state.globe.verticalExaggeration) ?? 1.00001;
  const displayQuality = useAppState((state) => state.globe.displayQuality);
  const globe = useAppState((state) => state.globe);

  const showInspector = useAppState((state) => state.globe.showInspector);
  const hasSatellite = useAppState((state) =>
    state.core.mapLayers.has(MapLayer.SATELLITE)
  );
  const mapIsLoading = useAppState((state) => state.core.mapIsLoading);

  const bedrockShown = useAppState((state) =>
    state.core.mapLayers.has(MapLayer.BEDROCK)
  );

  const mapStyle = useRef(null)

  let style = null;
  if (!hasSatellite) {
    style = reliefShading;
  }

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
      h(
        CesiumView,
        {
          full: true,
          onViewChange(cpos) {
            const { camera } = cpos;
            // Tamp down memory usage by clearing log statements
            //console.clear();
            runAction({
              type: "map-moved",
              data: {
                camera: {
                  lng: camera.longitude,
                  lat: camera.latitude,
                  altitude: camera.height,
                  pitch: 90 + camera.pitch,
                  bearing: camera.heading,
                },
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
          terrainProvider,
          flyTo: globe.flyToProps,
        },
        [
          //h(BaseLayer, { enabled: !hasSatellite }),
          h.if(!hasSatellite)(HillshadeLayer),
          h.if(hasSatellite)(SatelliteLayer),
          // h.if(style != null)(BaseLayer, {
          //   alpha: 1,
          //   style, //"mapbox://styles/jczaplewski/ckxcu9zmu4aln14mfg4monlv3/draft",
          // }),
          h(VectorGeologyLayer, { alpha: 0.5 }),
        ]
      ),
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
