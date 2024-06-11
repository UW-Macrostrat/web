import h from "@macrostrat/hyper";
import { MapboxMapProvider } from "@macrostrat/mapbox-react";
import { MapView } from "@macrostrat/map-interface";
import { FullscreenPage } from "~/layouts";

export function Page() {
  return h(FullscreenPage, [
    h("div", "Hello world"),
    h(MapboxMapProvider, h(InsetMap)),
  ]);
}

function InsetMap() {
  return h("div.column-selection-map", [h(MapView)]);
}
