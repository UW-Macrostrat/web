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
import { useStoredState } from "@macrostrat/ui-components";
import { JSONView, useDarkMode } from "@macrostrat/ui-components";
import mapboxgl from "mapbox-gl";
import { useCallback, useEffect, useState, useMemo } from "react";
import { useSelector } from "react-redux";
import { SETTINGS } from "~/map-interface/settings";
import { LoaderButton } from "../../map-interface/components/navbar";
import { useAppActions, useAppState } from "../../map-interface/app-state";
import { LocationPanel } from "@macrostrat/map-interface";
import { FloatingNavbar } from "../../map-interface/components/navbar";
import { MapAreaContainer } from "../../map-interface/map-page";
import { PanelCard } from "../../map-interface/map-page/menu";
import { getBaseMapStyle } from "../../map-interface/map-page/map-view/utils";
import { MapBottomControls } from "@macrostrat/map-interface/src/controls";
import { MapStyledContainer } from "@macrostrat/map-interface";
import {
  buildXRayStyle,
  toggleLineSymbols,
  buildMacrostratStyle,
  buildBasicStyle,
} from "@macrostrat/map-interface/src/styles";
import { CoreMapView, MapMarker } from "~/map-interface/map-page/map-view";
import {
  FeaturePanel,
  FeatureSelectionHandler,
  TileInfo,
} from "@macrostrat/map-interface/src/dev/vector-tile-features";
import { TileExtentLayer } from "@macrostrat/map-interface/src/dev/tile-extent";
import styles from "../main.module.styl";
import { useMapStyle, ParentRouteButton } from "./utils";

export enum MacrostratVectorTileset {
  Carto = "carto",
  CartoSlim = "carto-slim",
  IGCPOrogens = "igcp-orogens",
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
  xRay: false,
  showTileExtent: false,
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
  const runAction = useAppActions();
  /* We apply a custom style to the panel container when we are interacting
    with the search bar, so that we can block map interactions until search
    bar focus is lost.
    We also apply a custom style when the infodrawer is open so we can hide
    the search bar on mobile platforms
  */

  const loaded = useSelector((state) => state.core.initialLoadComplete);
  useEffect(() => {
    runAction({ type: "get-initial-map-state" });
  }, []);

  const [isOpen, setOpen] = useState(false);

  const [state, setState] = useStoredState(
    "macrostrat:vector-map-inspector",
    defaultState,
    isStateValid
  );
  const { showLineSymbols, xRay, showTileExtent, bypassCache } = state;

  const [inspectPosition, setInspectPosition] =
    useState<mapboxgl.LngLat | null>(null);

  const [data, setData] = useState(null);
  const isLoading = useAppState((state) => state.core.mapIsLoading);

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
    const style: mapboxgl.Style = xRay
      ? buildXRayStyle({ inDarkMode: isEnabled })
      : overlayStyle;
    return replaceSourcesForTileset(style, tileset);
  }, [xRay, tileset, overlayStyle, isEnabled]) as mapboxgl.Style;

  const style = useMapStyle(baseMapURL, _overlayStyle);

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
        h("div.spacer"),
        h(LoaderButton, {
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
      h(LineSymbolManager, { showLineSymbols }),
      h(TileExtentLayer, { tile, color: isEnabled ? "white" : "black" }),
    ])
  );
}

export function FeatureRecord({ feature }) {
  const props = feature.properties;
  return h("div.feature-record", [
    h.if(Object.keys(props).length > 0)("div.feature-properties", [
      h(JSONView, {
        data: props,
        hideRoot: true,
      }),
    ]),
  ]);
}

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

function replaceSourcesForTileset(
  style: mapboxgl.Style,
  tileset: MacrostratVectorTileset
) {
  return {
    ...style,
    sources: {
      ...style.sources,
      burwell: {
        type: "vector",
        tiles: [SETTINGS.burwellTileDomain + `/${tileset}/{z}/{x}/{y}`],
        tileSize: 512,
      },
    },
  };
}

interface DevMapStyleOptions {
  inDarkMode?: boolean;
  xRay?: boolean;
  tileset?: MacrostratVectorTileset;
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

function initializeMap(args = {}) {
  mapboxgl.accessToken = SETTINGS.mapboxAccessToken;
  const map = new mapboxgl.Map({
    container: "map",
    maxZoom: 18,
    //maxTileCacheSize: 0,
    logoPosition: "bottom-left",
    trackResize: true,
    antialias: true,
    optimizeForTerrain: true,
    ...args,
  });

  //setMapPosition(map, mapPosition);
  return map;
}

interface DevMapViewProps {
  style: mapboxgl.Style;
  children: React.ReactNode;
  transformRequest?: mapboxgl.TransformRequestFunction;
}

export function DevMapView(props: DevMapViewProps): React.ReactElement {
  const { style, transformRequest, children } = props;
  const { mapPosition } = useAppState((state) => state.core);

  let mapRef = useMapRef();

  //const baseMapURL = getBaseMapStyle(new Set([]), isDarkMode);

  /* HACK: Right now we need this to force a render when the map
    is done loading
    */
  const [mapInitialized, setMapInitialized] = useState(0);

  // Map initialization
  useEffect(() => {
    if (style == null) return;
    mapRef.current = initializeMap({ style, transformRequest });
    setMapInitialized(mapInitialized + 1);
  }, [style, transformRequest]);

  // Map style updating
  useEffect(() => {
    if (mapRef?.current == null || style == null) return;
    mapRef?.current?.setStyle(style);
  }, [mapRef.current, style]);

  useEffect(() => {
    const map = mapRef.current;
    if (map == null) return;
    setMapPosition(map, mapPosition);
  }, [mapRef.current, mapInitialized]);

  // This seems to do a bit of a poor job at the moment. Maybe because fo caching?

  return h(CoreMapView, null, [children]);
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
}) {
  // A stripped-down page for map development
  const runAction = useAppActions();
  /* We apply a custom style to the panel container when we are interacting
    with the search bar, so that we can block map interactions until search
    bar focus is lost.
    We also apply a custom style when the infodrawer is open so we can hide
    the search bar on mobile platforms
  */

  console.log(layer);
  const tileset = layer.id;

  const loaded = useSelector((state) => state.core.initialLoadComplete);
  useEffect(() => {
    runAction({ type: "get-initial-map-state" });
  }, []);

  const [isOpen, setOpen] = useState(false);

  const [state, setState] = useState({ showTileExtent: false });
  const { showTileExtent } = state;

  const [inspectPosition, setInspectPosition] =
    useState<mapboxgl.LngLat | null>(null);

  const [data, setData] = useState(null);
  const isLoading = useAppState((state) => state.core.mapIsLoading);

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
      tileURL: SETTINGS.burwellTileDomain + `/${tileset}/{z}/{x}/{y}`,
    });
  }, [tileset, isEnabled]) as mapboxgl.Style;

  const style = useMapStyle(baseMapURL, _overlayStyle);

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
        h("div.spacer"),
        h(LoaderButton, {
          active: isOpen,
          onClick: () => setOpen(!isOpen),
          isLoading,
        }),
      ]),
      contextPanel: h(PanelCard, [children]),
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

function LineSymbolManager({ showLineSymbols }) {
  const mapRef = useMapRef();
  useMapConditionalStyle(mapRef, showLineSymbols, toggleLineSymbols);
  return null;
}

export { MapStyledContainer, MapBottomControls };
export * from "./raster-map";
export * from "./catalog";
