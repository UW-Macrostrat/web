/**
 * A development interface for the "Weaver" point data server.
 */

import h from "@macrostrat/hyper";

import { SETTINGS } from "~/map-interface/settings";
import { buildMacrostratStyle } from "@macrostrat/mapbox-styles";
import { DarkModeButton } from "@macrostrat/ui-components";
import { Spacer, useDarkMode, useAPIResult } from "@macrostrat/ui-components";
import mapboxgl from "mapbox-gl";
import { useCallback, useState, useEffect } from "react";
import { buildInspectorStyle } from "@macrostrat/map-interface";
import { MapAreaContainer, PanelCard } from "@macrostrat/map-interface";
import { Spinner } from "@blueprintjs/core";
import {
  FloatingNavbar,
  MapLoadingButton,
  MapView,
  FeatureProperties,
} from "@macrostrat/map-interface";
import { MapMarker, LocationPanel } from "@macrostrat/map-interface";
import { MapPosition } from "@macrostrat/mapbox-utils";
import { mergeStyles } from "@macrostrat/mapbox-utils";
import { useMapRef } from "@macrostrat/mapbox-react";

export function WeaverPage() {
  return h(
    "div.weaver-page",
    h(WeaverMap, { overlayStyle, mapboxToken: SETTINGS.mapboxAccessToken })
  );
}

const _macrostratStyle = buildMacrostratStyle({
  tileserverDomain: SETTINGS.burwellTileDomain,
  fillOpacity: 0.3,
  strokeOpacity: 0.1,
}) as mapboxgl.Style;

const weaverStyle = {
  sources: {
    weaver: {
      type: "vector",
      tiles: [
        "https://dev.macrostrat.org/tiles/weaver-tile/{z}/{x}/{y}?model_name=MineralResourceSite",
      ],
    },
  },
  layers: [
    {
      id: "weaver",
      type: "circle",
      source: "weaver",
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
        "circle-color": "dodgerblue",
        "circle-opacity": 0.8,
        "circle-stroke-width": 0.5,
        "circle-stroke-color": "dodgerblue",
      },
    },
  ],
};

const overlayStyle = mergeStyles(_macrostratStyle, weaverStyle);

function FeatureDetails({ position }) {
  const mapRef = useMapRef();
  const result = useAPIResult(
    "https://dev.macrostrat.org/weaver-api/rpc/nearby_data",
    {
      x: position.lng,
      y: position.lat,
      zoom: Math.round(mapRef.current?.getZoom()) ?? 10,
      model_name: "MineralResourceSite",
    }
  );

  if (result == null) return h(Spinner);

  console.log(result);

  return h(
    "div.features",
    result.map((f, i) => {
      return h(FeatureProperties, { data: f.data, key: i, expandLevel: 1 });
    })
  );
}

function WeaverMap({
  title = "Weaver",
  headerElement = null,
  mapPosition = null,
  mapboxToken = null,
  overlayStyle = null,
}: {
  headerElement?: React.ReactElement;
  title?: string;
  children?: React.ReactNode;
  mapboxToken?: string;
  overlayStyle?: mapboxgl.Style | string;
  mapPosition?: MapPosition;
}) {
  /* We apply a custom style to the panel container when we are interacting
    with the search bar, so that we can block map interactions until search
    bar focus is lost.
    We also apply a custom style when the infodrawer is open so we can hide
    the search bar on mobile platforms
  */

  const [isOpen, setOpen] = useState(false);

  const style = useMapStyle(overlayStyle, mapboxToken);

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

      h(FeatureDetails, { position: inspectPosition })
    );
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
        h(DarkModeButton, { showText: true, minimal: true }),
      ]),
      detailPanel: detailElement,
      contextPanelOpen: isOpen,
    },
    h(
      MapView,
      {
        style,
        mapPosition,
        projection: "globe",
      },
      [
        h(MapMarker, {
          position: inspectPosition,
          setPosition: onSelectPosition,
        }),
      ]
    )
  );
}

function useMapStyle(overlayStyle = null, mapboxToken = null) {
  const dark = useDarkMode();
  const isEnabled = dark?.isEnabled;

  if (mapboxToken == null) {
    return null;
  }

  const baseStyle = isEnabled
    ? "mapbox://styles/mapbox/dark-v10"
    : "mapbox://styles/mapbox/light-v10";

  const [actualStyle, setActualStyle] = useState(baseStyle);

  useEffect(() => {
    buildInspectorStyle(baseStyle, overlayStyle, {
      mapboxToken,
      inDarkMode: isEnabled,
    }).then((s) => {
      console.log(s);
      setActualStyle(s);
    });
  }, [baseStyle, mapboxToken, isEnabled, overlayStyle]);
  return actualStyle;
}
