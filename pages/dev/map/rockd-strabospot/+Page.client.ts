/**
 * A development interface for rendering Rockd "checkins" and StraboSpot "spots".
 */

import h from "@macrostrat/hyper";
import { mapboxAccessToken } from "@macrostrat-web/settings";
import { useRockdStraboSpotStyle } from "./map-style";
// Import other components
import { useDarkMode } from "@macrostrat/ui-components";
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
  FeaturePanel,
  FeatureSelectionHandler,
} from "@macrostrat/map-interface";
import { MapPosition } from "@macrostrat/mapbox-utils";

mapboxgl.accessToken = mapboxAccessToken;

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
  children = null,
  bounds = null,
  focusedSource = null,
  focusedSourceTitle = null,
  fitViewport = true,
}: {
  headerElement?: React.ReactNode;
  transformRequest?: mapboxgl.TransformRequestFunction;
  title?: string;
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
}) {
  /* We apply a custom style to the panel container when we are interacting
    with the search bar, so that we can block map interactions until search
    bar focus is lost.
    We also apply a custom style when the infodrawer is open so we can hide
    the search bar on mobile platforms
  */

  const dark = useDarkMode();
  const isEnabled = dark?.isEnabled;

  const style = isEnabled
    ? "mapbox://styles/jczaplewski/cl5uoqzzq003614o6url9ou9z?optimize=true"
    : "mapbox://styles/jczaplewski/clatdbkw4002q14lov8zx0bm0?optimize=true";

  const [isOpen, setOpen] = useState(false);

  const [actualStyle, setActualStyle] = useState(null);

  useEffect(() => {
    buildInspectorStyle(style, overlayStyle, {
      mapboxToken,
      inDarkMode: isEnabled,
      xRay: false,
    }).then(setActualStyle);
  }, [style, mapboxToken, isEnabled, overlayStyle]);

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
      [h(FeaturePanel, { features: data, focusedSource, focusedSourceTitle })]
    );
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
        h("p", "This prototype shows Rockd Checkins and StraboSpot spots."),
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
        children,
      ]
    )
  );
}
