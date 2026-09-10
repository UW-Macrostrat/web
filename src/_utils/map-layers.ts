/** Functions to apply specific layers to map UIs */

import { burwellTileDomain } from "@macrostrat-web/settings";
import { buildMacrostratStyleLayers } from "@macrostrat/map-styles";

/** The live Macrostrat geologic map (the "carto v2" tileset), as an overlay
 * style for geographic context on top of a plain basemap.
 *
 * The source must be named "burwell" — that's what `buildMacrostratStyleLayers`
 * targets (source-layers `units` and `lines`). Semi-transparent by default so
 * whatever a page draws above it stays readable.
 */
export function macrostratCartoStyle(): mapboxgl.Style {
  return {
    version: 8,
    sources: {
      burwell: {
        type: "vector",
        tiles: [`${burwellTileDomain}/dev/carto/{z}/{x}/{y}`],
      },
    },
    layers: buildMacrostratStyleLayers({
      fillOpacity: 0.4,
      strokeOpacity: 0.4,
      lineOpacity: 0.8,
    }),
  };
}

export enum MacrostratVectorTileset {
  Carto = "carto",
  CartoSlim = "carto-slim",
  IGCPOrogens = "igcp-orogens",
  AllMaps = "all-maps",
}

export enum MacrostratRasterTileset {
  Carto = "carto",
  Emphasized = "emphasized",
}

export function buildCrossSectionLayers(): mapboxgl.Layer[] {
  // Get CSS colors from settings
  const ruleColor = getComputedStyle(document.body).getPropertyValue(
    "--panel-background-color"
  );

  const centerColor = getComputedStyle(document.body).getPropertyValue(
    "--panel-rule-color"
  );

  const crossSectionPointPaint = {
    "circle-radius": {
      stops: [
        [0, 3],
        [12, 5],
      ],
    },
    "circle-color": centerColor,
    "circle-stroke-width": {
      stops: [
        [0, 2],
        [12, 4],
      ],
    },
    "circle-stroke-color": ruleColor,
  };

  return [
    {
      id: "crossSectionLine",
      type: "line",
      source: "crossSectionLine",
      paint: {
        "line-width": {
          stops: [
            [0, 1],
            [12, 3],
          ],
        },
        "line-color": ruleColor,
        "line-opacity": 1,
      },
    },
    {
      id: "crossSectionEndpoint",
      type: "circle",
      source: "crossSectionEndpoints",
      paint: crossSectionPointPaint,
    },
    {
      id: "elevationMarker",
      type: "circle",
      source: "elevationMarker",
      paint: {
        ...crossSectionPointPaint,
        "circle-color": "#4bc0c0",
      },
    },
  ];
}
