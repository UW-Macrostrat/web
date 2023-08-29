/**
 * A development interface for the "Weaver" point data server.
 */

import h from "@macrostrat/hyper";

import mapboxgl from "mapbox-gl";
import { SETTINGS } from "~/map-interface/settings";
import { buildMacrostratStyle } from "@macrostrat/mapbox-styles";

import { DevMapPage } from "@macrostrat/map-interface";
import { mergeStyles } from "@macrostrat/mapbox-utils";

export function WeaverPage() {
  return h("div.weaver-page", h(WeaverMap));
}

const _macrostratStyle = buildMacrostratStyle({
  tileserverDomain: SETTINGS.burwellTileDomain,
  fillOpacity: 0.3,
  strokeOpacity: 0.1,
}) as mapboxgl.Style;

const weaverStyle = {
  sources: {
    weaver: {
      type: "vector",
      tiles: [
        "https://next.macrostrat.org/tiles/weaver-tile/{z}/{x}/{y}?model_name=MineralResourceSite",
      ],
    },
  },
  layers: [
    {
      id: "weaver",
      type: "circle",
      source: "weaver",
      "source-layer": "default",
      paint: {
        "circle-radius": [
          "step",
          ["get", "n"],
          2,
          1,
          2,
          5,
          4,
          10,
          8,
          50,
          12,
          100,
          16,
          200,
          20,
        ],
        "circle-color": "dodgerblue",
        "circle-opacity": 0.8,
        "circle-stroke-width": 0.5,
        "circle-stroke-color": "dodgerblue",
      },
    },
  ],
};

const overlayStyle = mergeStyles(_macrostratStyle, weaverStyle);

export function WeaverMap() {
  // A stripped-down page for map development

  return h(DevMapPage, {
    mapboxToken: SETTINGS.mapboxAccessToken,
    title: "Weaver",
    overlayStyle,
  });
}
