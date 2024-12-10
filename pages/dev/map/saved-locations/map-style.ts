import { tileserverDomain, mapboxAccessToken } from "@macrostrat-web/settings";
import { buildMacrostratStyle } from "@macrostrat/mapbox-styles";
import { mergeStyles, getMapboxStyle } from "@macrostrat/mapbox-utils";
import { useInDarkMode, useAsyncEffect } from "@macrostrat/ui-components";
import { useState } from "react";
import mapboxgl from "mapbox-gl";

//need to render saved locations on the map

export function useSavedLocationsStyle() {
  /** Hook to return a style object for the map overlay, including
   * macrostrat map layers, rockd checkins, and strabospot "notable spots',
   * with the appropriate color scheme for dark mode.
   * */
  const inDarkMode = useInDarkMode();

  const [style, setStyle] = useState(null);

  useAsyncEffect(async () => {
    const baseStyle = inDarkMode
      ? "mapbox://styles/jczaplewski/cl5uoqzzq003614o6url9ou9z?optimize=true"
      : "mapbox://styles/jczaplewski/clatdbkw4002q14lov8zx0bm0?optimize=true";
    const style = await getMapboxStyle(baseStyle, {
      access_token: mapboxAccessToken,
    });
    setStyle(
      mergeStyles(style, _macrostratStyle, buildCheckinStyle(inDarkMode))
    );
  }, [inDarkMode]);

  return style;
}

/** Macrostrat style with lower opacity than usual */
const _macrostratStyle = buildMacrostratStyle({
  tileserverDomain: tileserverDomain,
  fillOpacity: 0.2,
  strokeOpacity: 0.1,
}) as mapboxgl.Style;

function buildCheckinStyle(darkMode) {
  /** Function to build point styles */
  const colors = getColors(darkMode);

  return {
    sources: {
      rockdCheckins: {
        type: "vector",
        tiles: [tileserverDomain + "/checkins/tiles/{z}/{x}/{y}"],
        minzoom: 2,
        maxzoom: 12,
      },
      notableSpots: {
        type: "vector",
        tiles: [
          tileserverDomain +
            "/integrations/StraboSpot/Notable spots/tiles/{z}/{x}/{y}",
        ],
        minzoom: 2,
        maxzoom: 12,
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
          "circle-color": colors.checkins,
          "circle-opacity": 0.8,
          "circle-stroke-width": 0.5,
          "circle-stroke-color": colors.checkins,
        },
      },
      {
        id: "notable-spots",
        type: "circle",
        source: "notableSpots",
        "source-layer": "default",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 3, 16, 12],
          "circle-color": colors.spots,
          "circle-opacity": 0.8,
          "circle-stroke-width": 1,
          "circle-stroke-color": colors.spots,
        },
      },
    ],
  };
}

export function getColors(darkMode): { checkins: string; spots: string } {
  return {
    checkins: darkMode ? "#8561f5" : "#7426d3",
    spots: darkMode ? "#3fea71" : "#1d9a44",
  };
}
