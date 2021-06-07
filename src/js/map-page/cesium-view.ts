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
import { mapStyle } from "./vector-style";
import {
  getHashString,
  setHashString,
} from "@macrostrat/ui-components/util/query-string";
import {
  buildPositionHash,
  getInitialPosition,
} from "@macrostrat/cesium-viewer/query-string";

const GeologyLayer = ({ visibleMaps = null, ...rest }) => {
  const provider = useMemo(() => {
    let prov = new MVTImageryProvider({
      style: mapStyle,
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
  }, [visibleMaps]);

  const hasGeology = useSelector((state) => state.update.mapHasBedrock);

  if (!hasGeology) return null;

  return h(ImageryLayer, { imageryProvider: provider, ...rest });
};

function MacrostratSatelliteLayer() {
  const hasSatellite = useSelector((state) => state.update.mapHasSatellite);
  if (!hasSatellite) return null;
  return h(SatelliteLayer);
}

function MacrostratCesiumView(props) {
  const dispatch = useDispatch();
  const terrainExaggeration =
    useSelector((state) => state.globe.verticalExaggeration) ?? 1.0;
  const displayQuality = useSelector((state) => state.globe.displayQuality);
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
      h(HillshadeLayer),
      h(MacrostratSatelliteLayer),
      h(GeologyLayer, { alpha: 0.8 }),
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
      highResolution: true,
      onViewChange(cpos) {
        console.log(cpos);
        setHashString(buildPositionHash(cpos.camera));
      },
    },
    h(SatelliteLayer)
  );
}

export default MacrostratCesiumView;
