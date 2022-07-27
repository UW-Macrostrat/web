import { useEffect } from "react";
import { useMapElement } from "../map-view";
import { useAPIResult } from "@macrostrat/ui-components";
import { SETTINGS } from "~/map-interface/Settings";

const sourceMapStyle = {
  version: 8,
  sources: {
    "burwell-sources": {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    },
  },
  layers: [
    // {
    //   id: "sources-fill",
    //   type: "fill",
    //   source: "burwell-sources", // reference the data source
    //   paint: {
    //     "fill-opacity": 0.5,
    //     "fill-color": [
    //       "case",
    //       ["boolean", ["feature-state", "active"], false],
    //       "#ffae80",
    //       "#aaaaaa",
    //     ],
    //   },
    // },
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
        "line-width": 2,
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

export function MapSourcesLayer() {
  const map = useMapElement();
  const featureData: any[] = useAPIResult(
    SETTINGS.apiDomain + "/api/v2/defs/sources",
    { all: true, format: "geojson_bare" }
  );
  console.log(featureData);
  useEffect(() => {
    if (!map || !featureData) return;

    let styles = { ...sourceMapStyle };
    styles.sources["burwell-sources"].data = featureData;
    if (map.isStyleLoaded()) {
      mergeStyles(map, styles);
    } else {
      map.on("style.load", () => {
        console.log("Merging styles");
        mergeStyles(map, styles);
      });
    }
  }, [map, featureData]);
  return null;
}
