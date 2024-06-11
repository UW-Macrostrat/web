import { MapboxMapProvider } from "@macrostrat/mapbox-react";
import { MapAreaContainer, MapView } from "@macrostrat/map-interface";
import { FullscreenPage } from "~/layouts";
import h from "./main.module.sass";

export function Page() {
  return h(FullscreenPage, [
    h("div", "Hello world"),
    h(MapAreaContainer, h(InsetMap)),
  ]);
}

function InsetMap() {
  return h("div.column-selection-map", [h(MapView)]);
}
