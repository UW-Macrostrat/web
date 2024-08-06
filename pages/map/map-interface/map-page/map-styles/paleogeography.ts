import chroma from "chroma-js";
import { mergeStyles } from "@macrostrat/mapbox-utils";

export function applyAgeModelStyles(baseStyle, mapStyle, opts) {
  const {
    model,
    age,
    inDarkMode = false,
    tileserverDomain = "https://macrostrat.org/tiles",
  } = opts;

  let mapTileURL = tileserverDomain + "/carto-slim/{z}/{x}/{y}";
  if (age != null) {
    mapTileURL =
      tileserverDomain +
      `/carto-slim-rotated/{z}/{x}/{y}?model_id=${model}&t_step=${age}`;
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
