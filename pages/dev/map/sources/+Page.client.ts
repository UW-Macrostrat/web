import h from "@macrostrat/hyper";
// Import other components
import { mapboxAccessToken } from "@macrostrat-web/settings";
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
  FeatureSelectionHandler,
} from "@macrostrat/map-interface";
import { NonIdealState } from "@blueprintjs/core";
import { Link } from "~/components";
import { boundingGeometryMapStyle } from "~/map-styles";

export function Page() {
  const dark = useDarkMode();
  const isEnabled = dark?.isEnabled;

  const baseStyle = isEnabled
    ? "mapbox://styles/mapbox/dark-v10"
    : "mapbox://styles/mapbox/light-v10";

  const [isOpen, setOpen] = useState(false);

  const [actualStyle, setActualStyle] = useState(null);

  useEffect(() => {
    const overlayStyle = boundingGeometryMapStyle(isEnabled);

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
      h(MapInspectorPanel, { features: data })
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

function MapInspectorPanel({ features }) {
  let maps = features
    ?.filter((d) => d.source == "rgeom")
    ?.map((d) => d.properties);

  maps?.sort((a, b) => a.source_id - b.source_id);

  if (maps == null || maps.length == 0) {
    return h(NonIdealState, { icon: "map", title: "No maps found" });
  }

  return h("div", [
    h("h2", "Maps"),
    h(
      "ul",
      maps.map((d) => h(MapItem, { map: d }))
    ),
  ]);
}

function MapItem({ map }) {
  return h(
    "li",
    h(Link, { href: `/maps/${map.source_id}` }, [
      h("span.name", map.name),
      " ",
      h("code.id", map.source_id),
    ])
  );
}
