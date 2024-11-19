/**
 * A development interface for rendering "Rockd Checkins".
 */

import h from "@macrostrat/hyper";

import { mapboxAccessToken, tileserverDomain } from "@macrostrat-web/settings";
import { DevMapPage } from "@macrostrat/map-interface";
import { buildMacrostratStyle } from "@macrostrat/mapbox-styles";
import { mergeStyles } from "@macrostrat/mapbox-utils";
import mapboxgl from "mapbox-gl";
import { useInDarkMode } from "@macrostrat/ui-components";
import { useMemo } from "react";

export function Page() {
  const inDarkMode = useInDarkMode();
  const style = useMemo(() => {
    return mergeStyles(_macrostratStyle, buildCheckinStyle(inDarkMode));
  }, [inDarkMode]);

  return h(DevMapPage, {
    title: "Rockd + StraboSpot",
    overlayStyle: style,
    mapboxToken: mapboxAccessToken,
    // Start off showing the continental US, where there are lots of checkins
    bounds: [-125, 24, -66, 49],
  });
}

const _macrostratStyle = buildMacrostratStyle({
  tileserverDomain: tileserverDomain,
  fillOpacity: 0.2,
  strokeOpacity: 0.1,
}) as mapboxgl.Style;

function buildCheckinStyle(darkMode) {
  const color = darkMode ? "#8561f5" : "#7426d3";

  const spotsColor = darkMode ? "red" : "red";

  return {
    sources: {
      rockdCheckins: {
        type: "vector",
        tiles: [tileserverDomain + "/checkins/tiles/{z}/{x}/{y}"],
        minzoom: 2,
        maxzoom: 8,
      },
      notableSpots: {
        type: "vector",
        tiles: [
          tileserverDomain +
            "/integrations/StraboSpot/Notable spots/tiles/{z}/{x}/{y}",
        ],
        minzoom: 2,
        maxzoom: 8,
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
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 3, 16, 12],
          "circle-color": color,
          "circle-opacity": 0.8,
          "circle-stroke-width": 0.5,
          "circle-stroke-color": color,
        },
      },
      {
        id: "notable-spots",
        type: "circle",
        source: "notableSpots",
        "source-layer": "default",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 3, 16, 12],
          "circle-color": spotsColor,
          "circle-opacity": 0.8,
          "circle-stroke-width": 1,
          "circle-stroke-color": spotsColor,
        },
      },
    ],
  };
}
