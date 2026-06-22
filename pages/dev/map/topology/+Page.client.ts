import h from "@macrostrat/hyper";
// Import other components
import { burwellTileDomain, mapboxAccessToken } from "@macrostrat-web/settings";
// Import other components
import { Spacer, useDarkMode } from "@macrostrat/ui-components";
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
  PanelCard,
} from "@macrostrat/map-interface";
import { NonIdealState } from "@blueprintjs/core";
import { Link } from "~/components";

export function Page() {
  const dark = useDarkMode();
  const isEnabled = dark?.isEnabled;

  const baseStyle = isEnabled
    ? "mapbox://styles/mapbox/dark-v10"
    : "mapbox://styles/mapbox/light-v10";

  const [isOpen, setOpen] = useState(false);

  const [actualStyle, setActualStyle] = useState(null);

  useEffect(() => {
    const overlayStyle = topologyMapStyle(isEnabled);

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

  const contextPanel = h(
    PanelCard,
    h("p", "I will eventually be a layer selector")
  );

  return h(
    MapAreaContainer,
    {
      navbar: h(FloatingNavbar, [
        h("h2", "Map topology"),
        h(Spacer),
        h(MapLoadingButton, {
          active: isOpen,
          onClick: () => setOpen(!isOpen),
        }),
      ]),
      contextPanel,
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

function topologyMapStyle(
  darkMode: boolean,
  mapSlug: string = null
): mapboxgl.Style {
  let url = "/maps/bounds";
  if (mapSlug != null) {
    url += `/${mapSlug}`;
  }

  const color = darkMode ? 255 : 20;
  return {
    version: 8,
    sources: {
      topology: {
        type: "vector",
        tiles: [burwellTileDomain + `/dev/topology/elements/{z}/{x}/{y}`],
        maxzoom: 9,
      },
    },
    layers: buildTopologyLayers(),
  };
}

export function buildTopologyLayers() {
  return [
    // Edges
    {
      id: "edges",
      type: "line",
      source: "topology",
      "source-layer": "edges",
      paint: {
        "line-width": ["interpolate", ["linear"], ["zoom"], 0, 0.5, 12, 2],
        "line-color": "#4f11ab",
      },
    },
    // Nodes
    {
      id: "nodes",
      type: "circle",
      source: "topology",
      "source-layer": "nodes",
      "min-zoom": 4,
      layout: {
        "circle-sort-key": ["get", "n_edges"],
      },
      paint: {
        // Small radius when zoomed out and larger when zoomed in
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 0, 0.5, 12, 3],
        "circle-color": "#606ad9",
      },
    },
  ];
}
