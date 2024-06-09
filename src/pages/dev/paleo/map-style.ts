import { burwellTileDomain } from "@macrostrat-web/settings";
import { buildMacrostratStyle } from "@macrostrat/mapbox-styles";

// Import other components

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
  fog: {
    range: [10, 20],
    color: "#000000",
    "high-color": "hsl(207, 23%, 5%)",
    "space-color": "hsl(207, 23%, 10%)",
    "horizon-blend": 0.1,
    "star-intensity": 0,
  },
};

export const darkStyle = {
  name: "PaleoLight",
  ...common,
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
};

export const lightStyle = {
  name: "PaleoLight",
  ...common,
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
};

export function replaceSourcesForTileset(
  style: mapboxgl.Style,
  model_id: number = 6,
  age = 0
) {
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
        tileSize: 512,
      },
    },
  };
}

const _macrostratStyle = buildMacrostratStyle({
  tileserverDomain: burwellTileDomain,
}) as mapboxgl.Style;
