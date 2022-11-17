import { hyperStyled, compose } from "@macrostrat/hyper";
import { MapboxMapProvider } from "@macrostrat/mapbox-react";
import { CesiumView } from "../map-page";
import MapContainer from "../map-page/map-view";
import { useEffect, useState } from "react";
import styles from "./main.module.styl";

const h = hyperStyled(styles);

const _MapView = compose(MapboxMapProvider, MapContainer);

function LayoutWaiter({ children }) {
  // Hack to ensure Cesium container div has height before rendering viewer
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setTimeout(() => setReady(true), 1000);
  }, []);
  return ready ? children : null;
}

export function SplitMapPage() {
  return h("div.split-map.page", null, [
    h("div.left", h(LayoutWaiter, h(CesiumView))),
    h("div.right", h(_MapView)),
  ]);
}
