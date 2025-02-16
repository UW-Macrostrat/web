import { burwellTileDomain, mapboxAccessToken } from "@macrostrat-web/settings";
import { buildMacrostratStyle } from "@macrostrat/map-styles";
import { buildInspectorStyle } from "@macrostrat/map-interface";
import { useDarkMode } from "@macrostrat/ui-components";
import mapboxgl from "mapbox-gl";
import { useEffect, useState } from "react";

export function usePaleogeographyStyle({ age, model_id, xRay = false }) {
  const dark = useDarkMode();
  const isEnabled = dark?.isEnabled;
  const baseStyle: mapboxgl.Style = isEnabled ? darkStyle : lightStyle;
  const [style, setStyle] = useState(baseStyle);

  useEffect(() => {
    let _overlayStyle: mapboxgl.Style = buildMacrostratStyle({
      tileserverDomain: burwellTileDomain,
    }) as mapboxgl.Style;

    if (model_id != null && age != null) {
      _overlayStyle = replaceSourcesForTileset(_overlayStyle, model_id, age);
    }

    buildInspectorStyle(baseStyle, _overlayStyle, {
      mapboxToken: mapboxAccessToken,
      inDarkMode: isEnabled,
      xRay,
    }).then(setStyle);
  }, [baseStyle, xRay, age, model_id]);

  return style;
}

const baseTilesetURL =
  burwellTileDomain + "/carto-slim-rotated/{z}/{x}/{y}?model_id=3&t_step=0";

const common = {
  version: 8,
  sources: {
    burwell: {
      type: "vector",
      tiles: [baseTilesetURL],
      tileSize: 512,
    },
  },
  glyphs: "mapbox://fonts/mapbox/{fontstack}/{range}.pbf",
  sprite: "", //mapbox://sprites/mapbox/light-v10",
};

const darkStyle = {
  name: "PaleoDark",
  ...common,
  fog: {
    range: [10, 20],
    color: "hsla(0, 0%, 0%, 0.43)",
    "high-color": "hsl(207, 23%, 5%)",
    "space-color": "hsl(207, 23%, 10%)",
    "horizon-blend": 0.1,
    "star-intensity": 0.5,
  },
  layers: [
    {
      id: "background",
      type: "background",
      paint: {
        "background-color": "hsl(207, 18%, 21%)",
      },
    },
    {
      id: "plates",
      type: "fill",
      source: "burwell",
      "source-layer": "plates",
      paint: {
        //"fill-color": "color",
        "fill-color": "hsl(207, 18%, 30%)",
        "fill-opacity": 0.8,
      },
    },
  ],
} as mapboxgl.Style;

const lightStyle = {
  name: "PaleoLight",
  ...common,
  fog: {
    color: "#ffffff",
    "space-color": [
      "interpolate",
      ["linear"],
      ["zoom"],
      4,
      "hsl(215, 28%, 64%)",
      7,
      "hsl(209, 92%, 85%)",
    ],
    "star-intensity": ["interpolate", ["linear"], ["zoom"], 5, 0.35, 6, 0],
    range: [5, 15],
  },
  light: { intensity: 0.55 },
  layers: [
    {
      id: "background",
      type: "background",
      paint: {
        "background-color": "hsl(185, 9%, 81%)",
      },
    },
    {
      id: "plates",
      type: "fill",
      source: "burwell",
      "source-layer": "plates",
      paint: {
        //"fill-color": "color",
        "fill-color": "hsl(55, 11%, 96%)",
        "fill-opacity": 0.8,
      },
    },
  ],
  fog: {
    color: "#ffffff",
    "space-color": [
      "interpolate",
      ["linear"],
      ["zoom"],
      4,
      "hsl(215, 28%, 64%)",
      7,
      "hsl(209, 92%, 85%)",
    ],
    "star-intensity": ["interpolate", ["linear"], ["zoom"], 5, 0.35, 6, 0],
    range: [5, 15],
  },
} as mapboxgl.Style;

export function replaceSourcesForTileset(
  style: mapboxgl.Style,
  model_id: number,
  age = 0
): mapboxgl.Style {
  const tilesetURL =
    burwellTileDomain +
    `/carto-slim-rotated/{z}/{x}/{y}?model_id=${model_id}&t_step=${age}`;

  return {
    ...style,
    sources: {
      ...style.sources,
      burwell: {
        type: "vector",
        tiles: [tilesetURL],
      },
    },
  };
}
