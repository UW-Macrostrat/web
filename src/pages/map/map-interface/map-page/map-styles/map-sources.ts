import { useEffect } from "react";
import { useMapElement } from "@macrostrat/mapbox-react";
import { useAPIResult } from "@macrostrat/ui-components";
import { SETTINGS } from "~/settings";
import { features } from "process";

const sourceMapStyle = {
  version: 8,
  sources: {
    "burwell-sources": {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    },
  },
  layers: [
    {
      id: "sources-fill",
      type: "fill",
      source: "burwell-sources", // reference the data source
      paint: {
        "fill-opacity": ["get", "opacity"],
        "fill-color": [
          "case",
          ["boolean", ["feature-state", "active"], false],
          "#ffae80",
          "#aaaaaa",
        ],
      },
    },
    {
      id: "outline",
      type: "line",
      source: "burwell-sources",
      layout: {},
      paint: {
        "line-color": [
          "case",
          ["boolean", ["feature-state", "clicked"], false],
          "#ffae80",
          "#333",
        ],
        "line-width": 1.5,
      },
    },
  ],
};

function mergeStyles(map, style) {
  for (const [key, value] of Object.entries(style.sources)) {
    if (!map.getSource(key)) {
      map.addSource(key, value);
    }
  }
  for (const layer of style.layers) {
    if (!map.getLayer(layer.id)) {
      map.addLayer(layer);
    }
  }
}

function removeStyle(map, style) {
  for (const key in style.sources) {
    if (map.getSource(key)) {
      map.removeSource(key);
    }
  }
  for (const layer of style.layers) {
    if (map.getLayer(layer.id)) {
      map.removeLayer(layer.id);
    }
  }
}

export function MapSourcesLayer() {
  const map = useMapElement();
  const featureData: any = useAPIResult(
    SETTINGS.apiDomain + "/api/v2/defs/sources",
    { all: true, format: "geojson_bare" }
  );
  useEffect(() => {
    if (!map || !featureData) return;

    let styles = { ...sourceMapStyle };
    featureData.features.forEach((f) => {
      const lvl = Math.max(
        ["small", "medium", "large"].indexOf(f.properties.scale),
        0
      );

      f.properties.opacity = (lvl + 0.5) / 4;
    });
    styles.sources["burwell-sources"].data = featureData;
    if (map.isStyleLoaded()) {
      mergeStyles(map, styles);
    } else {
      map.on("style.load", () => {
        console.log("Merging styles");
        mergeStyles(map, styles);
      });
    }
    return () => {
      removeStyle(map, styles);
    };
  }, [map, featureData]);
  return null;
}
