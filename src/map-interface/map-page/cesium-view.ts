import CesiumView, { DisplayQuality } from "@macrostrat/cesium-viewer";
import h from "@macrostrat/hyper";
import { useDispatch, useSelector } from "react-redux";
import { queryMap, mapMoved } from "../actions";
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
import MVTImageryProvider from "mvt-imagery-provider";
import { coreStyle } from "./map-styles/core";
import {
  getHashString,
  setHashString,
} from "@macrostrat/ui-components/util/query-string";
import {
  buildPositionHash,
  getInitialPosition,
} from "@macrostrat/cesium-viewer/query-string";

const BaseGeologyLayer = ({ enabled = true, ...rest }) => {
  const provider = useMemo(() => {
    let prov = new MVTImageryProvider({
      style: coreStyle,
      maximumZoom: 13,
      tileSize: 512,
    });
    // let filter: any = ["boolean", true];
    // if (visibleMaps != null) {
    //   filter = [
    //     "match",
    //     ["get", "map_id"],
    //     Array.from(visibleMaps),
    //     true,
    //     false
    //   ];
    // }
    // console.log(filter);
    // prov.mapboxRenderer.setFilter("map-units", filter, false);
    // const res = prov.mapboxRenderer.setFilter("unit-edge", filter, false);
    // res();
    return prov;
  }, [enabled]);

  if (!enabled) return null;

  return h(ImageryLayer, { imageryProvider: provider, ...rest });
};

const GeologyLayer = ({ visibleMaps = null, ...rest }) => {
  const hasGeology = useSelector((state) => state.update.mapHasBedrock);
  return h(BaseGeologyLayer, { enabled: hasGeology, ...rest });
};

function MacrostratSatelliteLayer() {
  const hasSatellite = useSelector((state) => state.update.mapHasSatellite);
  if (!hasSatellite) return null;
  return h(SatelliteLayer);
}

function MacrostratHillshadeLayer() {
  const hasSatellite = useSelector((state) => state.update.mapHasSatellite);
  return h(HillshadeLayer, { enabled: !hasSatellite });
}

function MacrostratCesiumView(props) {
  const dispatch = useDispatch();
  const terrainExaggeration =
    useSelector((state) => state.globe.verticalExaggeration) ?? 1.00001;
  const displayQuality = useSelector((state) => state.globe.displayQuality);
  console.log(displayQuality);
  const globe = useSelector((state) => state.globe);

  const showInspector = useSelector((state) => state.globe.showInspector);

  return h(
    CesiumView,
    {
      onViewChange(cpos) {
        console.log(cpos);
        const { viewCenter } = cpos;
        if (viewCenter == null) return;
        console.log(viewCenter);
        dispatch(mapMoved(viewCenter));
      },
      onClick({ latitude, longitude, zoom }) {
        dispatch(queryMap(longitude, latitude, zoom, null));
      },
      terrainExaggeration,
      displayQuality,
      showInspector,
      terrainProvider,
      flyTo: globe.flyToProps,
    },
    [
      h(MacrostratHillshadeLayer),
      h(MacrostratSatelliteLayer),
      h(GeologyLayer, { alpha: 0.5 }),
    ]
  );
}

const initialPosition = getInitialPosition(getHashString());

export function GlobeDevPage() {
  console.log(initialPosition);
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
    [h(HillshadeLayer), h(BaseGeologyLayer)]
  );
}

export default MacrostratCesiumView;
