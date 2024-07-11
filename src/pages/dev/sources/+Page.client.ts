import h from "@macrostrat/hyper";
// Import other components
import { burwellTileDomain, mapboxAccessToken } from "@macrostrat-web/settings";
import { DevMapPage } from "@macrostrat/map-interface";

const overlayStyle = {
  version: 8,
  sources: {
    rgeom: {
      tileSize: 512,
      type: "vector",
      tiles: [burwellTileDomain + "/maps/bounds/{z}/{x}/{y}"],
    },
  },
  layers: [
    {
      id: "rgeom",
      type: "fill",
      source: "rgeom",
      "source-layer": "bounds",
      paint: {
        "fill-color": "rgba(255, 255, 255, 0.1)",
      },
    },
    {
      id: "rgeom-line",
      type: "line",
      source: "rgeom",
      "source-layer": "bounds",
      paint: {
        "line-color": "rgba(255, 255, 255, 0.5)",
        "line-width": 1,
      },
    },
  ],
};

export function Page() {
  // A route for each layer
  return h(DevMapPage, {
    title: "RGeom",
    mapboxToken: mapboxAccessToken,
    overlayStyle,
  });
}

// Import other components
import { Switch } from "@blueprintjs/core";
import hyper from "@macrostrat/hyper";
import { Spacer, useDarkMode, useStoredState } from "@macrostrat/ui-components";
import mapboxgl from "mapbox-gl";
import { useCallback, useState, useEffect } from "react";
import { buildInspectorStyle, buildXRayStyle } from "./xray";
import {
  MapMarker,
  FloatingNavbar,
  MapLoadingButton,
  MapAreaContainer,
  PanelCard,
} from "@macrostrat/map-interface";
import { LocationPanel } from "../location-panel";
import { MapView } from "../map-view";
import styles from "./main.module.sass";
import { TileExtentLayer } from "./tile-extent";
import {
  FeaturePanel,
  FeatureSelectionHandler,
  TileInfo,
} from "./vector-tile-features";
import { MapPosition } from "@macrostrat/mapbox-utils";

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

export function DevMapPage({
  title = "Map inspector",
  headerElement = null,
  transformRequest = null,
  mapPosition = null,
  mapboxToken = null,
  overlayStyle = null,
  children,
  style,
  focusedSource = null,
  focusedSourceTitle = null,
  projection = null,
}: {
  headerElement?: React.ReactElement;
  transformRequest?: mapboxgl.TransformRequestFunction;
  title?: string;
  style?: mapboxgl.Style | string;
  children?: React.ReactNode;
  mapboxToken?: string;
  overlayStyle?: mapboxgl.Style | string;
  focusedSource?: string;
  focusedSourceTitle?: string;
  projection?: string;
  mapPosition?: MapPosition;
}) {
  /* We apply a custom style to the panel container when we are interacting
    with the search bar, so that we can block map interactions until search
    bar focus is lost.
    We also apply a custom style when the infodrawer is open so we can hide
    the search bar on mobile platforms
  */

  const dark = useDarkMode();
  const isEnabled = dark?.isEnabled;

  if (mapboxToken != null) {
    mapboxgl.accessToken = mapboxToken;
  }

  style ??= isEnabled
    ? "mapbox://styles/mapbox/dark-v10"
    : "mapbox://styles/mapbox/light-v10";

  const [isOpen, setOpen] = useState(false);

  const [state, setState] = useStoredState("macrostrat:dev-map-page", {
    showTileExtent: false,
    xRay: false,
  });
  const { showTileExtent, xRay } = state;

  const [actualStyle, setActualStyle] = useState(style);

  useEffect(() => {
    buildInspectorStyle(style, overlayStyle, {
      mapboxToken,
      inDarkMode: isEnabled,
      xRay,
    }).then(setActualStyle);
  }, [style, xRay, mapboxToken, isEnabled, overlayStyle]);

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
        h(FeaturePanel, { features: data, focusedSource, focusedSourceTitle }),
      ]
    );
  }

  let tile = null;
  if (showTileExtent && data?.[0] != null) {
    let f = data[0];
    tile = { x: f._x, y: f._y, z: f._z };
  }

  return h(
    MapAreaContainer,
    {
      navbar: h(FloatingNavbar, [
        headerElement ?? h("h2", title),
        h(Spacer),
        h(MapLoadingButton, {
          active: isOpen,
          onClick: () => setOpen(!isOpen),
        }),
      ]),
      contextPanel: h(PanelCard, [
        h(Switch, {
          checked: xRay,
          label: "X-ray mode",
          onChange() {
            setState({ ...state, xRay: !xRay });
          },
        }),
        children,
      ]),
      detailPanel: detailElement,
      contextPanelOpen: isOpen,
    },
    h(
      MapView,
      {
        style: actualStyle,
        transformRequest,
        mapPosition,
        projection: { name: "globe" },
        mapboxToken,
      },
      [
        h(FeatureSelectionHandler, {
          selectedLocation: inspectPosition,
          setFeatures: setData,
        }),
        h(MapMarker, {
          position: inspectPosition,
          setPosition: onSelectPosition,
        }),
        h(TileExtentLayer, { tile, color: isEnabled ? "white" : "black" }),
      ]
    )
  );
}
