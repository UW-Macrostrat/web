// Import other components
import { Switch } from "@blueprintjs/core";
import { burwellTileDomain, mapboxAccessToken } from "@macrostrat-web/settings";
import hyper from "@macrostrat/hyper";
import {
  DevMapPage,
  // FeaturePanel,
  // FeatureSelectionHandler,
  // FloatingNavbar,
  // LocationPanel,
  // MapLoadingButton,
  // MapMarker,
  // MapView,
  // TileExtentLayer,
  // TileInfo,
  // MapAreaContainer,
  // PanelCard,
} from "@macrostrat/map-interface";
import { useMapConditionalStyle, useMapRef } from "@macrostrat/mapbox-react";
import {
  buildMacrostratStyle,
  toggleLineSymbols,
} from "@macrostrat/mapbox-styles";
import {
  getMapboxStyle,
  mergeStyles,
  removeMapLabels,
} from "@macrostrat/mapbox-utils";
import { useStoredState } from "@macrostrat/ui-components";
import mapboxgl from "mapbox-gl";
import { useCallback, useMemo } from "react";
import styles from "./main.module.styl";

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
    console.log(style);
    return style;
  }, [tileset, overlayStyle]) as mapboxgl.Style;

  const controls = h([
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
      headerElement,
      mapboxToken: mapboxAccessToken,
      title: title ?? tileset,
      overlayStyle: _overlayStyle,
      transformRequest,
    },
    controls
  );
}

export function buildRasterStyle(layer: MacrostratRasterTileset) {
  let tileURL = burwellTileDomain + `/${layer}/{z}/{x}/{y}.png`;

  // if (layer == MacrostratRasterTileset.Emphasized) {
  //   tileURL = `https://next.macrostrat.org/tiles/tiles/carto/{z}/{x}/{y}.png`;
  // }

  return {
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
}

export function replaceSourcesForTileset(
  style: mapboxgl.Style,
  tileset: MacrostratVectorTileset | string
) {
  let tilesetURL = tileset;
  if (!tilesetURL.startsWith("http")) {
    tilesetURL = burwellTileDomain + `/${tileset}/{z}/{x}/{y}`;
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

function LineSymbolManager({ showLineSymbols }) {
  const mapRef = useMapRef();
  useMapConditionalStyle(mapRef, showLineSymbols, toggleLineSymbols);
  return null;
}
