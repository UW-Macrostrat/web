// Import other components
import { Switch } from "@blueprintjs/core";
import { burwellTileDomain, mapboxAccessToken } from "@macrostrat-web/settings";
import hyper from "@macrostrat/hyper";
import {
  DevMapPage,
  FeaturePanel,
  FeatureSelectionHandler,
  FloatingNavbar,
  LocationPanel,
  MapLoadingButton,
  MapMarker,
  MapView,
  TileExtentLayer,
  TileInfo,
  MapAreaContainer,
  PanelCard,
} from "@macrostrat/map-interface";
import {
  buildBasicStyle,
  buildMacrostratStyle,
} from "@macrostrat/mapbox-styles";
import { Text } from "@blueprintjs/core";
import { useDarkMode, useStoredState } from "@macrostrat/ui-components";
import mapboxgl from "mapbox-gl";
import { useCallback, useMemo, useState } from "react";
import { ParentRouteButton } from "~/components/map-navbar";
import { getBaseMapStyle } from "@macrostrat-web/map-utils";
import styles from "../main.module.styl";
import { useMapStyle } from "./utils";
import { Spacer } from "@macrostrat/ui-components";
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

export const h = hyper.styled(styles);

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
    return replaceSourcesForTileset(overlayStyle, tileset);
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

  // TODO: styles need to be updated
  const _headerElement = h([
    h(ParentRouteButton),
    headerElement ?? h(Text, { tag: "h2", ellipsize: true }, title) ?? tileset,
  ]);

  return h(
    DevMapPage,
    {
      headerElement: _headerElement,
      mapboxToken: mapboxAccessToken,
      title: title ?? tileset,
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

  const tileset = layer.id;

  const _headerElement = h([
    h(ParentRouteButton),
    headerElement ?? h(Text, { tag: "h2", ellipsize: true }, title ?? tileset),
  ]);

  return h(
    DevMapPage,
    {
      headerElement: _headerElement,
      transformRequest,
      overlayStyle: buildBasicStyle({
        inDarkMode: false,
        tileURL: layer.tileurl,
      }),
    },
    children
  );
}

export * from "./catalog";
export * from "./raster-map";
