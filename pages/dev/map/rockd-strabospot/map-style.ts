import { tileserverDomain } from "@macrostrat-web/settings";

export function buildCheckinStyle(darkMode) {
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
