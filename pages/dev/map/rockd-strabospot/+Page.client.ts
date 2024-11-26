/**
 * A development interface for rendering Rockd "checkins" and StraboSpot "spots".
 */

import h from "@macrostrat/hyper";
import { mapboxAccessToken } from "@macrostrat-web/settings";
import { useRockdStraboSpotStyle } from "./map-style";
// Import other components
import { Switch } from "@blueprintjs/core";
import { useDarkMode, useStoredState } from "@macrostrat/ui-components";
import mapboxgl from "mapbox-gl";
import { useCallback, useState, useEffect } from "react";
import {
  MapView,
  MapMarker,
  LocationPanel,
  FloatingNavbar,
  MapAreaContainer,
  MapLoadingButton,
  PanelCard,
  buildInspectorStyle,
  TileExtentLayer,
  FeaturePanel,
  FeatureSelectionHandler,
  TileInfo,
} from "@macrostrat/map-interface";
import { MapPosition } from "@macrostrat/mapbox-utils";

export function Page() {
  const overlayStyle = useRockdStraboSpotStyle();

  return h(DevMapPage, {
    title: "Rockd + StraboSpot",
    overlayStyle,
    mapboxToken: mapboxAccessToken,
    // Start off showing the continental US, where there are lots of checkins
    bounds: [-125, 24, -66, 49],
  });
}

function DevMapPage({
  title = "Map inspector",
  headerElement = null,
  transformRequest = null,
  mapPosition = null,
  mapboxToken = null,
  overlayStyle = null,
  controls = null,
  children = null,
  style,
  bounds = null,
  focusedSource = null,
  focusedSourceTitle = null,
  fitViewport = true,
  styleType = "macrostrat",
}: {
  headerElement?: React.ReactNode;
  transformRequest?: mapboxgl.TransformRequestFunction;
  title?: string;
  style?: mapboxgl.Style | string;
  controls?: React.ReactNode;
  children?: React.ReactNode;
  mapboxToken?: string;
  overlayStyle?: mapboxgl.Style | string;
  focusedSource?: string;
  focusedSourceTitle?: string;
  projection?: string;
  mapPosition?: MapPosition;
  bounds?: [number, number, number, number];
  fitViewport?: boolean;
  styleType?: "standard" | "macrostrat";
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

  if (styleType == "macrostrat") {
    style ??= isEnabled
      ? "mapbox://styles/jczaplewski/cl5uoqzzq003614o6url9ou9z?optimize=true"
      : "mapbox://styles/jczaplewski/clatdbkw4002q14lov8zx0bm0?optimize=true";
  } else {
    style ??= isEnabled
      ? "mapbox://styles/mapbox/dark-v10"
      : "mapbox://styles/mapbox/light-v10";
  }

  const [isOpen, setOpen] = useState(false);

  const [state, setState] = useStoredState("macrostrat:dev-map-page", {
    showTileExtent: false,
    xRay: false,
  });
  const { showTileExtent, xRay } = state;

  const [actualStyle, setActualStyle] = useState(null);

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
      navbar: h(FloatingNavbar, {
        rightElement: h(MapLoadingButton, {
          large: true,
          active: isOpen,
          onClick: () => setOpen(!isOpen),
          style: {
            marginRight: "-5px",
          },
        }),
        headerElement,
        title,
      }),
      contextPanel: h(PanelCard, [
        controls,
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
      fitViewport,
    },
    h(
      MapView,
      {
        style: actualStyle,
        transformRequest,
        mapPosition,
        projection: { name: "globe" },
        mapboxToken,
        bounds,
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
        children,
      ]
    )
  );
}
