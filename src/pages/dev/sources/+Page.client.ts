import h from "@macrostrat/hyper";
// Import other components
import { burwellTileDomain, mapboxAccessToken } from "@macrostrat-web/settings";
import { DevMapPage } from "@macrostrat/map-interface";
import mapboxgl from "mapbox-gl";
import { useMemo } from "react";
import {
  MacrostratVectorTileset,
  replaceSourcesForTileset,
} from "~/_utils/map-layers.client";

const overlayStyle = {
  version: 8,
  sources: {
    rgeom: {
      tileSize: 512,
      type: "vector",
      tiles: [burwellTileDomain + "/maps/bounds/{z}/{x}/{y}"],
    },
  },
  layers: [
    {
      id: "rgeom",
      type: "fill",
      source: "rgeom",
      "source-layer": "bounds",
      paint: {
        "fill-color": "rgba(255, 255, 255, 0.1)",
      },
    },
    {
      id: "rgeom-line",
      type: "line",
      source: "rgeom",
      "source-layer": "bounds",
      paint: {
        "line-color": "rgba(255, 255, 255, 0.5)",
        "line-width": 1,
      },
    },
  ],
};

export function Page() {
  // A route for each layer
  return h(DevMapPage, {
    title: "RGeom",
    mapboxToken: mapboxAccessToken,
    overlayStyle,
  });
}
