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
  FeaturePanel,
  FeatureSelectionHandler,
} from "@macrostrat/map-interface";
import { MapPosition } from "@macrostrat/mapbox-utils";

mapboxgl.accessToken = mapboxAccessToken;

export function Page() {
  const style = useRockdStraboSpotStyle();

  return h(DevMapPage, {
    title: "Rockd + StraboSpot",
    style,
    // Start off showing the continental US, where there are lots of checkins
    bounds: [-125, 24, -66, 49],
  });
}

function DevMapPage({
  title = "Map inspector",
  style,
  headerElement = null,
  transformRequest = null,
  mapPosition = null,
  bounds = null,
  focusedSource = null,
  focusedSourceTitle = null,
}: {
  headerElement?: React.ReactNode;
  transformRequest?: mapboxgl.TransformRequestFunction;
  title?: string;
  controls?: React.ReactNode;
  children?: React.ReactNode;
  mapboxToken?: string;
  style?: mapboxgl.Style | string;
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

  const [isOpen, setOpen] = useState(false);

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
        style,
        transformRequest,
        mapPosition,
        projection: { name: "globe" },
        mapboxToken: mapboxAccessToken,
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
      ]
    )
  );
}
