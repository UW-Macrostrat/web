import CesiumView, { DisplayQuality } from "@macrostrat/cesium-viewer";
import h from "@macrostrat/hyper";
import { useDispatch, useSelector } from "react-redux";
import { queryMap, mapMoved } from "../actions";
import {
  MapChangeTracker,
  MapClickHandler
} from "@macrostrat/cesium-viewer/position";
import {
  HillshadeLayer,
  //GeologyLayer,
  SatelliteLayer,
  terrainProvider
} from "@macrostrat/cesium-viewer/layers";
import { ImageryLayer } from "resium";
import { useMemo } from "react";
import MVTImageryProvider from "mvt-imagery-provider";
import { mapStyle } from "./vector-style";

const GeologyLayer = ({ visibleMaps = null, ...rest }) => {
  const provider = useMemo(() => {
    let prov = new MVTImageryProvider({
      style: mapStyle,
      maximumZoom: 13,
      tileSize: 512
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

  const hasGeology = useSelector(state => state.update.mapHasBedrock);

  if (!hasGeology) return null;

  return h(ImageryLayer, { imageryProvider: provider, ...rest });
};

function MacrostratCesiumView(props) {
  const dispatch = useDispatch();
  const terrainExaggeration =
    useSelector(state => state.globe.verticalExaggeration) ?? 1.0;
  const displayQuality = useSelector(state => state.globe.displayQuality);
  const globe = useSelector(state => state.globe);

  const showInspector = useSelector(state => state.globe.showInspector);

  return h(
    CesiumView,
    {
      onViewChange(cpos) {
        console.log(cpos);
        const { viewCenter } = cpos;
        if (viewCenter == null) return;
        dispatch(mapMoved(viewCenter));
      },
      onClick({ latitude, longitude, zoom }) {
        dispatch(queryMap(longitude, latitude, zoom, null));
      },
      terrainExaggeration,
      displayQuality: DisplayQuality.High,
      showInspector,
      terrainProvider,
      flyTo: globe.flyToProps
    },
    [h(HillshadeLayer), h(SatelliteLayer), h(GeologyLayer, { alpha: 0.5 })]
  );
}

export default MacrostratCesiumView;
