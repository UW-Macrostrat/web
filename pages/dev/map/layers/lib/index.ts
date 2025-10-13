// Import other components
import { Switch } from "@blueprintjs/core";
import { burwellTileDomain, mapboxAccessToken } from "@macrostrat-web/settings";
import hyper from "@macrostrat/hyper";
import { DevMapPage } from "@macrostrat/map-interface";
import { buildBasicStyle, buildMacrostratStyle } from "@macrostrat/map-styles";
import { useInDarkMode, useStoredState } from "@macrostrat/ui-components";
import mapboxgl from "mapbox-gl";
import { useCallback, useMemo } from "react";
import { DevPageHeader } from "./utils";
import {
  MacrostratVectorTileset,
  MacrostratRasterTileset,
  buildMapStyle,
  buildRasterStyle,
  replaceSourcesForTileset,
  LineSymbolManager,
} from "~/_utils/map-layers.client";

// Re-export things just in case
export {
  MacrostratVectorTileset,
  MacrostratRasterTileset,
  buildRasterStyle,
  buildMapStyle,
};

export const h = hyper;

const _macrostratStyle = buildMacrostratStyle({
  tileserverDomain: burwellTileDomain,
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
    if (state[k] != null && typeof state[k] != "boolean") {
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
  headerElement?: React.ReactNode;
  title?: string;
  tileset?: MacrostratVectorTileset;
  overlayStyle?: mapboxgl.Style;
  children?: React.ReactNode;
}) {
  // A stripped-down page for map development

  const [state, setState] = useStoredState(
    "macrostrat:vector-map-inspector",
    defaultState,
    isStateValid
  );
  const { showLineSymbols, bypassCache } = state;

  const transformRequest = useCallback(
    (url, resourceType) => {
      // remove cache
      if (
        bypassCache &&
        resourceType === "Tile" &&
        url.startsWith(burwellTileDomain)
      ) {
        return {
          url: url + "?cache=bypass",
        };
      }
      return { url };
    },
    [bypassCache]
  );

  const _overlayStyle = useMemo(() => {
    const style = replaceSourcesForTileset(overlayStyle, tileset);
    console.log("style", style);
    return style;
  }, [tileset, overlayStyle]) as mapboxgl.Style;

  const controls = h([
    children,
    h(Switch, {
      checked: showLineSymbols,
      label: "Show line symbols",
      onChange() {
        setState({ ...state, showLineSymbols: !showLineSymbols });
      },
    }),
    h(Switch, {
      checked: bypassCache,
      label: "Bypass cache",
      onChange() {
        setState({ ...state, bypassCache: !bypassCache });
      },
    }),
    h(LineSymbolManager, { showLineSymbols }),
  ]);

  return h(
    DevMapPage,
    {
      headerElement: h(DevPageHeader, {
        headerElement,
        title,
      }),
      mapboxToken: mapboxAccessToken,
      overlayStyle: _overlayStyle,
      transformRequest,
    },
    controls
  );
}

export function BasicLayerInspectorPage({
  title = null,
  headerElement = null,
  transformRequest = null,
  children,
  layer,
}: {
  headerElement?: React.ReactElement;
  transformRequest?: mapboxgl.TransformRequestFunction;
  title?: string;
  overlayStyle?: mapboxgl.Style;
  children?: React.ReactNode;
  layer: any;
}) {
  // A stripped-down page for map development
  /* We apply a custom style to the panel container when we are interacting
    with the search bar, so that we can block map interactions until search
    bar focus is lost.
    We also apply a custom style when the infodrawer is open so we can hide
    the search bar on mobile platforms
  */

  const inDarkMode = useInDarkMode();

  console.log(layer);

  return h(
    DevMapPage,
    {
      headerElement: h(DevPageHeader, {
        headerElement,
        title: title ?? layer.id,
      }),
      transformRequest,
      overlayStyle: buildBasicStyle({
        inDarkMode,
        tileURL: layer.tileurl,
      }),
      mapboxToken: mapboxAccessToken,
      bounds: layer.bounds,
    },
    children
  );
}

export * from "./raster-map";
