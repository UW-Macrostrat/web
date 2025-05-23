// Import other components
import { burwellTileDomain, mapboxAccessToken } from "@macrostrat-web/settings";
import { useMapConditionalStyle, useMapRef } from "@macrostrat/mapbox-react";
import { toggleLineSymbols } from "@macrostrat/map-styles";
import {
  getMapboxStyle,
  mergeStyles,
  removeMapLabels,
} from "@macrostrat/mapbox-utils";
import mapboxgl from "mapbox-gl";
import { MacrostratVectorTileset, MacrostratRasterTileset } from "./map-layers";

export * from "./map-layers";

export function replaceSourcesForTileset(
  style: mapboxgl.Style,
  tileset: MacrostratVectorTileset | string,
  parameters: Record<string, string | string[]>
) {
  let tilesetURL;
  if (!tileset.startsWith("http")) {
    tilesetURL = burwellTileDomain + `/${tileset}/{z}/{x}/{y}`;
  } else {
    tilesetURL = tileset;
  }

  if (parameters != null) {
    let urlParams = new URLSearchParams();
    // For each parameter that isn't empty add it to the URL
    for (const [key, value] of Object.entries(parameters)) {
      if (value != null && value != "") {
        // If the value is a list of strings append each one
        if (Array.isArray(value)) {
          for (const v of value) {
            urlParams.append(key, v);
          }
        } else {
          urlParams.append(key, value);
        }
      }
    }

    tilesetURL += urlParams.toString() ? `?${urlParams.toString()}` : "";
  }

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

export async function buildMapStyle(
  baseMapURL: string,
  overlayStyle: mapboxgl.Style
  //postProcess: (style: mapboxgl.Style) => mapboxgl.Style = (s) => s
  //styleOptions: DevMapStyleOptions = {}
) {
  mapboxgl.accessToken = mapboxAccessToken;
  const style = await getMapboxStyle(baseMapURL, {
    access_token: mapboxgl.accessToken,
  });
  //const { inDarkMode, xRay = false, tileset } = styleOptions;
  //const overlayStyles: any = xRay ? buildXRayStyle({ inDarkMode }) : mapStyle;

  return removeMapLabels(mergeStyles(style, overlayStyle));
}

export function LineSymbolManager({ showLineSymbols }) {
  const mapRef = useMapRef();
  useMapConditionalStyle(mapRef, showLineSymbols, toggleLineSymbols);
  return null;
}

export function buildRasterStyle(layer: MacrostratRasterTileset | string) {
  let tileURL = layer;
  if (!tileURL.startsWith("http")) {
    const tileDomain = "https://tiles.macrostrat.org";
    tileURL = tileDomain + `/${layer}/{z}/{x}/{y}.png`;
  }
  // if (layer == MacrostratRasterTileset.Emphasized) {
  //   tileURL = `https://next.macrostrat.org/tiles/tiles/carto/{z}/{x}/{y}.png`;
  // }

  const style = {
    version: 8,
    sources: {
      burwell: {
        type: "raster",
        tiles: [tileURL],
        tileSize: 256,
      },
    },
    layers: [
      {
        id: "burwell",
        type: "raster",
        source: "burwell",
        paint: {
          "raster-opacity": 0.5,
        },
      },
    ],
  };
  return style;
}
