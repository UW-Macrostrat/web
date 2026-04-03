import { asChromaColor, toRGBAString } from "@macrostrat/color-utils";

export function baseElements(
  sourceID,
  featureType,
  suffix = "",
  filter = null
) {
  let id = sourceID + "_" + featureType;
  if (suffix != null && suffix != "") {
    id += "_" + suffix;
  }
  let lyr = {
    id,
    source: sourceID,
    "source-layer": featureType,
  };

  if (filter != null) {
    lyr.filter = filter;
  }
  return lyr;
}

interface IngestionStyleOptions {
  color?: string;
  inDarkMode?: boolean;
  sourceLayers?: string[];
  sourceID?: string;
  featureTypes?: string[];
  tileURL: string;
  filter?: string;
  suffix?: string;
  adjustForDarkMode?: boolean;
  fillOpacity?: number;
}

export function buildBasicStyle({
  color = "rgb(74, 242, 161)",
  inDarkMode,
  sourceLayers,
  sourceID = "tileLayer",
  featureTypes = ["points", "lines", "polygons"],
  tileURL,
  filter = null,
  suffix = null,
  adjustForDarkMode = true,
  fillOpacity = 0.1,
}: IngestionStyleOptions): mapboxgl.StyleSpecification {
  const xRayColor = (opacity = 1, darken = 0) => {
    const c0 = asChromaColor(color).alpha(opacity);
    let c1 = c0;
    if (adjustForDarkMode) {
      if (!inDarkMode) {
        c1 = c0.darken(2 - darken);
      }
      c1 = c0.darken(darken);
    }
    return toRGBAString(c1);
  };

  let layers = [];

  const fillOutlineOpacity = Math.max(fillOpacity + 0.4, 1);

  if (featureTypes.includes("points")) {
    layers.push({
      ...baseElements(sourceID, "points", suffix, filter),
      type: "circle",
      paint: {
        "circle-color": xRayColor(1, 1),
        "circle-radius": 5,
      },
    });
  }

  if (featureTypes.includes("lines")) {
    layers.push({
      ...baseElements(sourceID, "lines", suffix, filter),
      type: "line",
      paint: {
        "line-color": xRayColor(1, -1),
        "line-width": 1.5,
      },
    });
  }

  if (featureTypes.includes("polygons")) {
    layers.push({
      ...baseElements(sourceID, "polygons", suffix, filter),
      type: "fill",
      paint: {
        "fill-color": xRayColor(fillOpacity),
        "fill-outline-color": xRayColor(fillOutlineOpacity),
      },
    });
  }

  return {
    version: 8,
    name: "basic",
    sources: {
      [sourceID]: {
        type: "vector",
        url: tileURL,
      },
    },
    layers,
  };
}
