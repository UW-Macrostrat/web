import { hyperStyled, compose } from "@macrostrat/hyper";
import { GlobeDevPage } from "../map-page/cesium-view";
import { MapboxMapProvider } from "@macrostrat/mapbox-react";
import MapContainer from "../map-page/map-view";
import styles from "./main.module.styl";

const h = hyperStyled(styles);

const _MapView = compose(MapboxMapProvider, MapContainer);

export function SplitMapPage() {
  return h("div.split-map.page", null, [
    h("div.left", h(GlobeDevPage)),
    h("div.right", h(_MapView)),
  ]);
}
