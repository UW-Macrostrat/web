import { tileserverDomain } from "@macrostrat-web/settings";
import { buildMacrostratStyle } from "@macrostrat/mapbox-styles";
import { mergeStyles } from "@macrostrat/mapbox-utils";
import { useInDarkMode } from "@macrostrat/ui-components";
import { useMemo } from "react";
import mapboxgl from "mapbox-gl";

export function useRockdStraboSpotStyle() {
  /** Hook to return a style object for the map overlay, including
   * macrostrat map layers, rockd checkins, and strabospot "notable spots',
   * with the appropriate color scheme for dark mode.
   * */
  const inDarkMode = useInDarkMode();

  const baseStyle = inDarkMode
    ? "mapbox://styles/jczaplewski/cl5uoqzzq003614o6url9ou9z?optimize=true"
    : "mapbox://styles/jczaplewski/clatdbkw4002q14lov8zx0bm0?optimize=true";

  return useMemo(() => {
    return mergeStyles(
      baseStyle,
      _macrostratStyle,
      buildCheckinStyle(inDarkMode)
    );
  }, [inDarkMode]);
}

/** Macrostrat style with lower opacity than usual */
const _macrostratStyle = buildMacrostratStyle({
  tileserverDomain: tileserverDomain,
  fillOpacity: 0.2,
  strokeOpacity: 0.1,
}) as mapboxgl.Style;

function buildCheckinStyle(darkMode) {
  /** Function to build point styles */
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
