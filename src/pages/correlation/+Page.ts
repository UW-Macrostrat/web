import { MapView } from "@macrostrat/map-interface";
import { MapboxMapProvider } from "@macrostrat/mapbox-react";
import { FullscreenPage } from "~/layouts";
import h from "./main.module.sass";
import { baseMapURL, mapboxAccessToken } from "@macrostrat-web/settings";
import { PageBreadcrumbs } from "~/renderer";

export function Page() {
  return h(FullscreenPage, [
    h("header", [h(PageBreadcrumbs)]),
    h("div.flex.row", [
      h("div.correlation-diagram.grow"),
      h("div.assistant", [h(InsetMap)]),
    ]),
  ]);
}

function InsetMap() {
  return h("div.column-selection-map", [
    h(
      MapboxMapProvider,
      h(MapView, { style: baseMapURL, accessToken: mapboxAccessToken })
    ),
  ]);
}
