import h from "@macrostrat/hyper";
import { MacrostratVectorTileset } from "~/dev/map-layers";
import { DevMapPage } from "@macrostrat/map-interface";
import { buildMacrostratStyle } from "@macrostrat/mapbox-styles";
import { useStoredState } from "@macrostrat/ui-components";
import mapboxgl from "mapbox-gl";
import { useCallback, useMemo } from "react";
import { SETTINGS } from "~/map-interface/settings";
// Having to include these global styles is a bit awkward
import "~/styles/global.styl";

export default function PaleoMap() {
  return h(VectorMapInspectorPage, {
    tileset: MacrostratVectorTileset.Carto,
  });
}

// Import other components

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

const defaultState = {
  showLineSymbols: false,
  bypassCache: true,
};

export function VectorMapInspectorPage({
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
    title: title ?? tileset,
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
