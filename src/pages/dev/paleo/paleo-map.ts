import h from "@macrostrat/hyper";
import { MacrostratVectorTileset } from "~/dev/map-layers";
import { DevMapPage } from "./map-area";
import { buildMacrostratStyle } from "@macrostrat/mapbox-styles";
import { useStoredState } from "@macrostrat/ui-components";
import mapboxgl from "mapbox-gl";
import { useCallback, useMemo } from "react";
import { SETTINGS } from "~/map-interface/settings";
// Having to include these global styles is a bit awkward
import "~/styles/global.styl";

// Import other components

export default function PaleoMap({
  tileset = MacrostratVectorTileset.CartoSlim,
  overlayStyle = _macrostratStyle,
  title = null,
  headerElement = null,
  children,
}: {
  headerElement?: React.ReactElement;
  title?: string;
  tileset?: MacrostratVectorTileset;
  overlayStyle?: mapboxgl.Style;
  children?: React.ReactNode;
}) {
  // A stripped-down page for map development

  const _overlayStyle = useMemo(() => {
    return replaceSourcesForTileset(overlayStyle, tileset);
  }, [tileset, overlayStyle]) as mapboxgl.Style;

  return h(DevMapPage, {
    headerElement,
    mapboxToken: SETTINGS.mapboxAccessToken,
    title: "Paleogeography",
    overlayStyle: _overlayStyle,
  });
}

export function replaceSourcesForTileset(
  style: mapboxgl.Style,
  tileset: MacrostratVectorTileset | string
) {
  let tilesetURL = tileset;
  if (!tilesetURL.startsWith("http")) {
    tilesetURL = SETTINGS.burwellTileDomain + `/${tileset}/{z}/{x}/{y}`;
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

const _macrostratStyle = buildMacrostratStyle({
  tileserverDomain: SETTINGS.burwellTileDomain,
}) as mapboxgl.Style;

function isStateValid(state) {
  if (state == null) {
    return false;
  }
  if (typeof state != "object") {
    return false;
  }
  // Must have several specific boolean keys
  for (let k of ["showLineSymbols", "xRay", "showTileExtent", "bypassCache"]) {
    if (typeof state[k] != "boolean") {
      return false;
    }
  }
  return true;
}
