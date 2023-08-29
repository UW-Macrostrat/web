import { SETTINGS } from "../../settings";
import chroma from "chroma-js";
import { intervals } from "@macrostrat/timescale";
import { mergeStyles } from "@macrostrat/mapbox-utils";
import { buildOverlayLayers } from "@macrostrat/mapbox-styles";

export function buildXRayStyle({ inDarkMode = false }): mapboxgl.Style {
  const xRayColor = (opacity = 1, darken = 0) => {
    if (!inDarkMode) {
      return chroma("rgb(74, 242, 161)")
        .darken(2 - darken)
        .alpha(opacity)
        .css();
    }
    return chroma("rgb(74, 242, 161)").alpha(opacity).darken(darken).css();
  };

  return {
    version: 8,
    name: "xray",
    sources: {
      burwell: {
        type: "vector",
        tiles: [SETTINGS.burwellTileDomain + `/carto-slim/{z}/{x}/{y}`],
        tileSize: 512,
      },
    },
    layers: [
      {
        id: "burwell",
        type: "fill",
        source: "burwell",
        "source-layer": "units",
        paint: {
          "fill-color": xRayColor(0.1),
          "fill-outline-color": xRayColor(0.5),
        },
      },
      {
        id: "burwell-line",
        type: "line",
        source: "burwell",
        "source-layer": "lines",
        paint: {
          "line-color": xRayColor(1, -1),
          "line-width": 1.5,
        },
      },
    ],
  };
}

export function applyAgeModelStyles(
  age,
  model,
  baseStyle,
  mapStyle,
  inDarkMode = false
) {
  let mapTileURL = "https://dev.macrostrat.org/tiles/carto-slim/{z}/{x}/{y}";
  if (age != null) {
    mapTileURL = `https://dev.macrostrat.org/tiles/carto-slim-rotated/{z}/{x}/{y}?model_id=${model}&t_step=${age}`;
  }

  let color = chroma("rgb(180, 180, 200)");
  let ageSpan = 4500;
  for (let interval of intervals) {
    let intAgeSpan = interval.eag - interval.lag;
    if (interval.eag > age && interval.lag < age && intAgeSpan < ageSpan) {
      color = chroma(interval.col);
    }
  }

  const newBaseStyle = {
    ...baseStyle,
    sources: {},
    layers: [],
  };

  const overlays = {
    ...mapStyle,
    //layers: mapStyle.layers.filter((l) => !l.id.startsWith("column")),
  };

  let styles = mergeStyles(
    newBaseStyle,
    {
      version: 8,
      layers: [
        {
          id: "plate-polygons",
          type: "fill",
          source: "burwell",
          "source-layer": "plates",
          paint: {
            "fill-color": inDarkMode ? "rgb(60,60,70)" : "rgb(170,170,200)",
            "fill-outline-color": inDarkMode
              ? "rgb(70, 70, 80)"
              : "rgb(150,150,150)",
          },
        },
        {
          id: "land",
          type: "fill",
          source: "burwell",
          "source-layer": "land",
          paint: {
            "fill-color": inDarkMode ? "rgb(80,80,90)" : "rgb(200,200,203)",
          },
        },
        // {
        //   id: "column_outline",
        //   type: "line",
        //   source: "burwell",
        //   "source-layer": "columns",
        //   paint: {
        //     "line-color": color.css(),
        //     "line-width": 1.5,
        //     "line-opacity": 0.8,
        //   },
        // },
      ],
    },
    overlays
  );

  styles.sources.burwell = {
    type: "vector",
    tiles: [mapTileURL],
    tileSize: 512,
  };

  return styles;
}
