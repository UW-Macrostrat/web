import h from "@macrostrat/hyper";
// Import other components
import { burwellTileDomain, mapboxAccessToken } from "@macrostrat-web/settings";
// Import other components
import { Spacer, useDarkMode } from "@macrostrat/ui-components";
import mapboxgl from "mapbox-gl";
import { useCallback, useState, useEffect } from "react";
import {
  MapMarker,
  FloatingNavbar,
  MapLoadingButton,
  MapAreaContainer,
  buildInspectorStyle,
  LocationPanel,
  MapView,
  FeaturePanel,
  FeatureSelectionHandler,
} from "@macrostrat/map-interface";

export function Page() {
  const dark = useDarkMode();
  const isEnabled = dark?.isEnabled;

  const baseStyle = isEnabled
    ? "mapbox://styles/mapbox/dark-v10"
    : "mapbox://styles/mapbox/light-v10";

  const [isOpen, setOpen] = useState(false);

  const [actualStyle, setActualStyle] = useState(null);

  useEffect(() => {
    const color = isEnabled ? 255 : 20;

    const overlayStyle: mapboxgl.Style = {
      version: 8,
      sources: {
        rgeom: {
          type: "vector",
          tiles: [burwellTileDomain + "/maps/bounds/{z}/{x}/{y}"],
          minzoom: 1,
          maxzoom: 9,
        },
      },
      layers: [
        {
          id: "rgeom",
          type: "fill",
          source: "rgeom",
          "source-layer": "bounds",
          paint: {
            "fill-color": `rgba(${color}, ${color}, ${color}, 0.1)`,
          },
        },
        {
          id: "rgeom-line",
          type: "line",
          source: "rgeom",
          "source-layer": "bounds",
          paint: {
            "line-color": `rgba(${color}, ${color}, ${color}, 0.5)`,
            "line-width": 1,
          },
        },
      ],
    };

    buildInspectorStyle(baseStyle, overlayStyle, {
      mapboxToken: mapboxAccessToken,
      inDarkMode: isEnabled,
      xRay: false,
    }).then(setActualStyle);
  }, [isEnabled]);

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
      [h(FeaturePanel, { features: data })]
    );
  }

  if (actualStyle == null) {
    return null;
  }

  return h(
    MapAreaContainer,
    {
      navbar: h(FloatingNavbar, [
        h("h2", "Map sources"),
        h(Spacer),
        h(MapLoadingButton, {
          active: isOpen,
          onClick: () => setOpen(!isOpen),
        }),
      ]),
      contextPanel: null,
      detailPanel: detailElement,
      contextPanelOpen: isOpen,
    },
    h(
      MapView,
      {
        style: actualStyle,
        mapPosition: null,
        projection: { name: "globe" },
        mapboxToken: mapboxAccessToken,
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
