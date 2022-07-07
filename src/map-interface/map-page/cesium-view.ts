import CesiumView, { DisplayQuality } from "@macrostrat/cesium-viewer";
import h from "@macrostrat/hyper";
import { useDispatch, useSelector } from "react-redux";
import {
  MapChangeTracker,
  MapClickHandler,
} from "@macrostrat/cesium-viewer/position";
import {
  HillshadeLayer,
  //GeologyLayer,
  SatelliteLayer,
  terrainProvider,
} from "@macrostrat/cesium-viewer/layers";
import { ImageryLayer } from "resium";
import { useEffect, useMemo } from "react";
import MVTImageryProvider from "cesium-vector-provider/src";
import reliefShading from "./map-styles/relief-shading";
import {
  getHashString,
  setHashString,
} from "@macrostrat/ui-components/util/query-string";
import {
  buildPositionHash,
  getInitialPosition,
} from "@macrostrat/cesium-viewer/query-string";
import maplibre from "maplibre-gl/dist/maplibre-gl-dev";
import { useAppActions, MapLayer, useAppState } from "../app-state";
import { useCallback } from "react";
import { positionClass } from "@blueprintjs/core/lib/esm/common/classes";
import { mapStyle, coreStyle } from "./map-styles";

maplibre.accessToken =
  "pk.eyJ1IjoiamN6YXBsZXdza2kiLCJhIjoiY2szNXA5OWcxMDN2bzNtcnI1cWd1ZXJpYiJ9.Dd5GKlrPhg969y1ayY32cg";

const BaseGeologyLayer = ({ enabled = true, ...rest }) => {
  const provider = useMemo(() => {
    return new MVTImageryProvider({
      style: reliefShading,
      maximumZoom: 13,
      tileSize: 512,
      opacity: 0.5,
    });
  }, [enabled]);

  if (!enabled) return null;

  return h(ImageryLayer, { imageryProvider: provider, ...rest });
};

const GeologyLayer = ({ visibleMaps = null, ...rest }) => {
  const hasGeology = useAppState((state) =>
    state.core.mapLayers.has(MapLayer.BEDROCK)
  );
  return h(BaseGeologyLayer, { enabled: hasGeology, ...rest });
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
    return new MVTImageryProvider({
      style,
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

  let style = null;
  if (!hasSatellite) {
    style = bedrockShown ? mapStyle : reliefShading;
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

  return h(
    CesiumView,
    {
      onViewChange(cpos) {
        const { camera } = cpos;
        // Tamp down memory usage by clearing log statements
        console.clear();
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
      //h(MacrostratHillshadeLayer),
      h.if(hasSatellite)(SatelliteLayer),
      h.if(style != null)(BaseLayer, {
        alpha: 1,
        style, //"mapbox://styles/jczaplewski/ckxcu9zmu4aln14mfg4monlv3/draft",
      }),
    ]
  );
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
        console.log(cpos);
        setHashString(buildPositionHash(cpos.camera));
      },
    },
    [h(BaseGeologyLayer)]
  );
}

export default MacrostratCesiumView;
