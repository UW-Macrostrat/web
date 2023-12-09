// Import other components
import { Spinner, Switch } from "@blueprintjs/core";
import hyper from "@macrostrat/hyper";
import { useMapConditionalStyle, useMapRef } from "@macrostrat/mapbox-react";
import {
  getMapboxStyle,
  mergeStyles,
  removeMapLabels,
  setMapPosition,
} from "@macrostrat/mapbox-utils";
import { useStoredState, useDarkMode } from "@macrostrat/ui-components";
import mapboxgl from "mapbox-gl";
import { useCallback, useEffect, useState, useMemo } from "react";
import { SETTINGS } from "~/pages/map/map-interface/settings";
import { FloatingNavbar } from "@macrostrat/map-interface";
import { useAppActions } from "../../pages/map/map-interface/app-state";
import { LocationPanel } from "@macrostrat/map-interface";
import { MapAreaContainer } from "../../pages/map/map-interface/map-page";
import { PanelCard } from "../../pages/map/map-interface/map-page/menu";
import { getBaseMapStyle } from "../../pages/map/map-interface/map-page/map-view";
import { MapLoadingButton } from "@macrostrat/map-interface";
import {
  toggleLineSymbols,
  buildMacrostratStyle,
  buildBasicStyle,
} from "@macrostrat/mapbox-styles";
import { MapView, MapMarker } from "@macrostrat/map-interface";
import {
  FeaturePanel,
  FeatureSelectionHandler,
  TileInfo,
} from "@macrostrat/map-interface";
import { TileExtentLayer } from "@macrostrat/map-interface";
import { useMapStatus } from "@macrostrat/mapbox-react";
import styles from "../main.module.styl";
import { useMapStyle } from "./utils";
import { DevMapPage } from "@macrostrat/map-interface";
import { ParentRouteButton } from "~/components/map-navbar";

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
        url.startsWith(SETTINGS.burwellTileDomain)
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
      mapboxToken: SETTINGS.mapboxAccessToken,
      title: title ?? tileset,
      overlayStyle: _overlayStyle,
      transformRequest,
    },
    controls
  );
}

/** 
  let tile = null;
  if (showTileExtent && data?.[0] != null) {
    let f = data[0];
    tile = { x: f._x, y: f._y, z: f._z };
  }

  if (!loaded) return h(Spinner);

  return h(
    MapAreaContainer,
    {
      navbar: h(FloatingNavbar, { className: "searchbar" }, [
        h([h(ParentRouteButton), headerElement ?? h("h2", title ?? tileset)]),
        h(Spacer),
        h(MapLoadingButton, {
          active: isOpen,
          onClick: () => setOpen(!isOpen),
          isLoading,
        }),
      ]),
      contextPanel: h(PanelCard, [
        children,
        h(Switch, {
          checked: xRay,
          label: "X-ray mode",
          onChange() {
            setState({ ...state, xRay: !xRay });
          },
        }),
      ]),
      detailPanel: detailElement,
      contextPanelOpen: isOpen,
    },
    h(DevMapView, { style, transformRequest }, [
      h(FeatureSelectionHandler, {
        selectedLocation: inspectPosition,
        setFeatures: setData,
      }),
      h(MapMarker, {
        position: inspectPosition,
        setPosition: onSelectPosition,
      }),
      h(TileExtentLayer, { tile, color: isEnabled ? "white" : "black" }),
    ])
  );
}
*/

function LineSymbolMapControls() {}

export function buildRasterStyle(layer: MacrostratRasterTileset) {
  let tileURL = SETTINGS.burwellTileDomain + `/${layer}/{z}/{x}/{y}.png`;

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

interface DevMapStyleOptions {
  inDarkMode?: boolean;
  xRay?: boolean;
  tileset?: MacrostratVectorTileset | string;
}

export async function buildMapStyle(
  baseMapURL: string,
  overlayStyle: mapboxgl.Style
  //postProcess: (style: mapboxgl.Style) => mapboxgl.Style = (s) => s
  //styleOptions: DevMapStyleOptions = {}
) {
  mapboxgl.accessToken = SETTINGS.mapboxAccessToken;
  const style = await getMapboxStyle(baseMapURL, {
    access_token: mapboxgl.accessToken,
  });
  //const { inDarkMode, xRay = false, tileset } = styleOptions;
  //const overlayStyles: any = xRay ? buildXRayStyle({ inDarkMode }) : mapStyle;

  return removeMapLabels(mergeStyles(style, overlayStyle));
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
  const runAction = useAppActions();
  /* We apply a custom style to the panel container when we are interacting
    with the search bar, so that we can block map interactions until search
    bar focus is lost.
    We also apply a custom style when the infodrawer is open so we can hide
    the search bar on mobile platforms
  */

  const tileset = layer.id;

  const { isInitialized: loaded, isLoading } = useMapStatus();

  const [isOpen, setOpen] = useState(false);

  const [state, setState] = useState({ showTileExtent: false });
  const { showTileExtent } = state;

  const [inspectPosition, setInspectPosition] =
    useState<mapboxgl.LngLat | null>(null);

  const [data, setData] = useState(null);

  const onSelectPosition = useCallback((position: mapboxgl.LngLat) => {
    setInspectPosition(position);
  }, []);

  let detailElement = null;
  if (inspectPosition != null) {
    detailElement = h(
      LocationPanel,
      {
        onClose() {
          setInspectPosition(null);
        },
        position: inspectPosition,
      },
      [
        h(TileInfo, {
          feature: data?.[0] ?? null,
          showExtent: showTileExtent,
          setShowExtent() {
            setState({ ...state, showTileExtent: !showTileExtent });
          },
        }),
        h(FeaturePanel, { features: data }),
      ]
    );
  }

  const { isEnabled } = useDarkMode();

  // Style management
  const baseMapURL = getBaseMapStyle(new Set([]), isEnabled);

  const _overlayStyle = useMemo(() => {
    return buildBasicStyle({
      inDarkMode: isEnabled,
      tileURL: layer.tileurl,
    });
  }, [layer, isEnabled]) as mapboxgl.Style;

  const style = useMapStyle(baseMapURL, _overlayStyle);

  let tile = null;
  if (showTileExtent && data?.[0] != null) {
    let f = data[0];
    tile = { x: f._x, y: f._y, z: f._z };
  }

  //if (!loaded) return h(Spinner);

  return h(
    MapAreaContainer,
    {
      navbar: h(FloatingNavbar, { className: "searchbar" }, [
        h([h(ParentRouteButton), headerElement ?? h("h2", title ?? tileset)]),
        h("div.spacer"),
        h(MapLoadingButton, {
          active: isOpen,
          onClick: () => setOpen(!isOpen),
        }),
      ]),
      contextPanel: h(PanelCard, [children]),
      detailPanel: detailElement,
      contextPanelOpen: isOpen,
    },
    h(MapView, { style, transformRequest, accessToken: mapboxgl.accessToken }, [
      h(FeatureSelectionHandler, {
        selectedLocation: inspectPosition,
        setFeatures: setData,
      }),
      h(MapMarker, {
        position: inspectPosition,
        setPosition: onSelectPosition,
      }),
      h(TileExtentLayer, { tile, color: isEnabled ? "white" : "black" }),
    ])
  );
}

function LineSymbolManager({ showLineSymbols }) {
  const mapRef = useMapRef();
  useMapConditionalStyle(mapRef, showLineSymbols, toggleLineSymbols);
  return null;
}

export * from "./raster-map";
export * from "./catalog";
