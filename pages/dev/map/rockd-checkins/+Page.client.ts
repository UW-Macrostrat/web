/**
 * A development interface for rendering "Rockd Checkins".
 */

import h from "@macrostrat/hyper";

import { mapboxAccessToken } from "@macrostrat-web/settings";
import { DevMapPage } from "@macrostrat/map-interface";
import { tileserverDomain } from "@macrostrat-web/settings";
import { buildMacrostratStyle } from "@macrostrat/mapbox-styles";
import { mergeStyles } from "@macrostrat/mapbox-utils";
import mapboxgl from "mapbox-gl";

export function Page() {
  return h(RockdCheckinsMap);
}

const _macrostratStyle = buildMacrostratStyle({
  tileserverDomain: tileserverDomain,
  fillOpacity: 0.3,
  strokeOpacity: 0.1,
}) as mapboxgl.Style;

const checkinStyle = {
  sources: {
    rockdCheckins: {
      type: "vector",
      tiles: [tileserverDomain + "/checkins/tiles/{z}/{x}/{y}"],
      minzoom: 4,
      maxzoom: 16,
    },
  },
  layers: [
    {
      id: "rockd-checkins",
      type: "circle",
      source: "rockdCheckins",
      "source-layer": "default",
      paint: {
        // Increase the size of the circles as we zoom in
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 2, 16, 12],
        "circle-color": "purple",
        "circle-opacity": 0.8,
        "circle-stroke-width": 0.5,
        "circle-stroke-color": "purple",
      },
    },
  ],
};

function RockdCheckinsMap() {
  const style = mergeStyles(_macrostratStyle, checkinStyle);

  return h(DevMapPage, {
    title: "Rockd checkins",
    overlayStyle: style,
    mapboxToken: mapboxAccessToken,
    // Start off showing the continental US, where there are lots of checkins
    bounds: [-125, 24, -66, 49],
  });
}
