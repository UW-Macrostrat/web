import { burwellTileDomain } from "@macrostrat-web/settings";

export function boundingGeometryMapStyle(
  darkMode: boolean,
  mapSlug: string = null
): mapboxgl.Style {
  let url = "/maps/bounds";
  if (mapSlug != null) {
    url += `/${mapSlug}`;
  }

  const color = darkMode ? 255 : 20;
  return {
    version: 8,
    sources: {
      rgeom: {
        type: "vector",
        tiles: [burwellTileDomain + `${url}/{z}/{x}/{y}`],
        maxzoom: 9,
      },
    },
    layers: [
      {
        id: "rgeom",
        type: "fill",
        source: "rgeom",
        "source-layer": "bounds",
        paint: {
          "fill-color": `rgba(${color}, ${color}, ${color}, 0.1)`,
        },
      },
      {
        id: "rgeom-line",
        type: "line",
        source: "rgeom",
        "source-layer": "bounds",
        paint: {
          "line-color": `rgba(${color}, ${color}, ${color}, 0.5)`,
          "line-width": 1,
        },
      },
    ],
  };
}
