/**
 * A development interface for rendering "Rockd Checkins".
 */

import h from "@macrostrat/hyper";

import { Button, MenuItem, Spinner } from "@blueprintjs/core";
import { Select2 } from "@blueprintjs/select";
import { SETTINGS } from "@macrostrat-web/settings";
import {
  FloatingNavbar,
  LocationPanel,
  MapAreaContainer,
  MapMarker,
  MapView,
  PanelCard,
} from "@macrostrat/map-interface";
import { useMapRef } from "@macrostrat/mapbox-react";
import { buildMacrostratStyle } from "@macrostrat/mapbox-styles";
import { mergeStyles } from "@macrostrat/mapbox-utils";
import { DarkModeButton, Spacer, useDarkMode } from "@macrostrat/ui-components";
import mapboxgl from "mapbox-gl";
import { useCallback, useEffect, useState } from "react";

export function Page() {
  return h(
    "div.rockd-checkins-page",
    h(RockdCheckinsMap, { mapboxToken: SETTINGS.mapboxAccessToken })
  );
}

mapboxgl.accessToken = SETTINGS.mapboxAccessToken;

const _macrostratStyle = buildMacrostratStyle({
  tileserverDomain: SETTINGS.burwellTileDomain,
  fillOpacity: 0.3,
  strokeOpacity: 0.1,
}) as mapboxgl.Style;

const checkinStyle = {
  sources: {
    rockdCheckins: {
      type: "vector",
      tiles: ["http://localhost:8000/checkins/tiles/{z}/{x}/{y}"],
    },
  },
  layers: [
    {
      id: "rockd-checkins",
      type: "circle",
      source: "rockdCheckins",
      "source-layer": "default",
      paint: {
        "circle-radius": [
          "step",
          ["get", "n"],
          2,
          1,
          2,
          5,
          4,
          10,
          8,
          50,
          12,
          100,
          16,
          200,
          20,
        ],
        "circle-color": "purple",
        "circle-opacity": 0.8,
        "circle-stroke-width": 0.5,
        "circle-stroke-color": "purple",
      },
    },
  ],
};

function RockdCheckinsMap({
  title = "Rockd Checkins",
  headerElement = null,
  mapboxToken,
}: {
  headerElement?: React.ReactElement;
  title?: string;
  children?: React.ReactNode;
  mapboxToken?: string;
}) {
  const [isOpen, setOpen] = useState(false);
  const [inspectPosition, setInspectPosition] =
    useState<mapboxgl.LngLat | null>(null);

  const style = useMapStyle(mapboxToken);

  const onSelectPosition = useCallback((position: mapboxgl.LngLat) => {
    setInspectPosition(position);
  }, []);

  // Mock detail panel
  const detailElement =
    inspectPosition != null
      ? h(
          LocationPanel,
          {
            onClose() {
              setInspectPosition(null);
            },
            position: inspectPosition,
          },
          h("p", "Details about the selected Rockd Checkin would appear here.")
        )
      : null;

  return h(
    MapAreaContainer,
    {
      navbar: h(FloatingNavbar, [
        headerElement ?? h("h2", title),
        h(Spacer),
        h(Button, { text: "Toggle Panel", onClick: () => setOpen(!isOpen) }),
      ]),
      contextPanel: h(PanelCard, [
        h(DarkModeButton, { showText: true, minimal: true }),
      ]),
      detailPanel: detailElement,
      contextPanelOpen: isOpen,
    },
    h(MapView, { style, mapboxToken }, [
      h(MapMarker, {
        position: inspectPosition,
        setPosition: onSelectPosition,
      }),
    ])
  );
}

function useMapStyle(mapboxToken) {
  const dark = useDarkMode();
  const isEnabled = dark?.isEnabled;

  const baseStyle = isEnabled
    ? "mapbox://styles/mapbox/dark-v10"
    : "mapbox://styles/mapbox/light-v10";

  const [actualStyle, setActualStyle] = useState(baseStyle);

  useEffect(() => {
    const overlayStyle = mergeStyles(_macrostratStyle, checkinStyle);
    setActualStyle(overlayStyle);
  }, [baseStyle]);
  return actualStyle;
}
