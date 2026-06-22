/** Management interface for the Macrostrat map topology.
 *
 * All API routes are at tiles.{macrostrat_instance}/dev/topology...
 *
 * List layers: /layers
 *
 * Tile routes for each layer:
 * - Topology faces: /faces/{layer}/{z}/{x}/{y} - map_faces for a specific map layer
 * - Topology elements: /elements/{z}/{x}/{y} - edges, nodes for the whole topology
 *                     /elements/{layer}/{z}/{x}/{y} - edges, nodes for a specific map layer
 *
 *  The {layer} path segment is a map layer's `slug` (e.g. "tiny", "carto-small").
 *
 *  Info (not yet implemented):
 *  /info?lng=<lng>&lat=<lat>
 *
 */

import hyper from "@macrostrat/hyper";
import { burwellTileDomain, mapboxAccessToken } from "@macrostrat-web/settings";
import { Spacer, useDarkMode, ErrorCallout } from "@macrostrat/ui-components";
import { useCallback, useMemo, useState } from "react";
import {
  MapMarker,
  FloatingNavbar,
  MapLoadingButton,
  MapAreaContainer,
  LocationPanel,
  MapView,
  FeatureSelectionHandler,
  PanelCard,
} from "@macrostrat/map-interface";
import {
  NonIdealState,
  FormGroup,
  HTMLSelect,
  Switch,
  Spinner,
} from "@blueprintjs/core";
import { atom, useAtom, useAtomValue } from "jotai";
import { loadable } from "jotai/utils";
import { Link } from "~/components";
import styles from "./main.module.scss";

const h = hyper.styled(styles);

/** A map layer as returned by /dev/topology/layers */
interface TopologyLayer {
  id: number;
  name: string;
  description: string | null;
  parent: number | null;
  composited_from: number[] | null;
  slug: string;
  min_zoom: number;
  max_zoom: number;
}

/** Fetch the list of available map layers. */
const layersAtom = atom(async (get, { signal }): Promise<TopologyLayer[]> => {
  const res = await fetch(`${burwellTileDomain}/dev/topology/layers`, {
    signal,
  });
  if (!res.ok) {
    throw new Error(`Failed to load topology layers: ${res.statusText}`);
  }
  return res.json();
});

const layersLoadableAtom = loadable(layersAtom);

/** The slug of the selected map layer, or null for the whole topology. */
const selectedLayerSlugAtom = atom<string | null>(null);

/** Whether to render topology elements (edges + nodes). Off by default. */
const showElementsAtom = atom(false);

/** The selected layer object, resolved from the loaded layer list. */
const selectedLayerAtom = atom<TopologyLayer | null>((get) => {
  const slug = get(selectedLayerSlugAtom);
  if (slug == null) return null;
  const layers = get(layersLoadableAtom);
  if (layers.state !== "hasData") return null;
  return layers.data.find((d) => d.slug === slug) ?? null;
});

export function Page() {
  const dark = useDarkMode();
  const isEnabled = dark?.isEnabled;

  const baseStyle = isEnabled
    ? "mapbox://styles/mapbox/dark-v10"
    : "mapbox://styles/mapbox/light-v10";

  const [isOpen, setOpen] = useState(true);

  const [inspectPosition, setInspectPosition] =
    useState<mapboxgl.LngLat | null>(null);

  const [data, setData] = useState(null);

  const selectedLayer = useAtomValue(selectedLayerAtom);
  const showElements = useAtomValue(showElementsAtom);

  const overlayStyles = useMemo(
    () => [topologyMapStyle(selectedLayer, showElements)],
    [selectedLayer, showElements]
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
      h(MapInspectorPanel, { features: data })
    );
  }

  const contextPanel = h(PanelCard, h(LayerSelectorPanel));

  return h(
    MapAreaContainer,
    {
      navbar: h(FloatingNavbar, [
        h("h2", selectedLayer?.name ?? "Map topology"),
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
        style: baseStyle,
        mapPosition: null,
        projection: { name: "globe" },
        mapboxToken: mapboxAccessToken,
        overlayStyles,
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

function LayerSelectorPanel() {
  const layers = useAtomValue(layersLoadableAtom);
  const [selectedSlug, setSelectedSlug] = useAtom(selectedLayerSlugAtom);
  const [showElements, setShowElements] = useAtom(showElementsAtom);

  let layerControl = null;
  if (layers.state === "loading") {
    layerControl = h(Spinner);
  } else if (layers.state === "hasError") {
    layerControl = h(ErrorCallout, { error: layers.error });
  } else {
    const options = [
      { label: "Whole topology", value: "" },
      ...layers.data.map((layer) => ({
        label: layer.name,
        value: layer.slug,
      })),
    ];

    layerControl = h(
      FormGroup,
      { label: "Map layer", className: "layer-field" },
      h(HTMLSelect, {
        fill: true,
        options,
        value: selectedSlug ?? "",
        onChange: (evt) => setSelectedSlug(evt.target.value || null),
      })
    );
  }

  return h("div.layer-selector", [
    layerControl,
    h(Switch, {
      label: "Show elements",
      checked: showElements,
      onChange: (evt) => setShowElements(evt.currentTarget.checked),
    }),
  ]);
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

/** Build the topology overlay style for the given layer.
 *
 * When a layer is selected, its faces are shown. Topology elements (edges +
 * nodes) are rendered on top only when `showElements` is enabled — for the
 * selected layer, or for the whole topology when no layer is selected.
 */
function topologyMapStyle(
  layer: TopologyLayer | null,
  showElements: boolean
): mapboxgl.Style {
  const slug = layer?.slug;

  const sources: mapboxgl.Style["sources"] = {};
  const layers: mapboxgl.AnyLayer[] = [];

  // Faces render underneath elements, so add them first.
  if (slug != null) {
    sources.faces = {
      type: "vector",
      tiles: [`${burwellTileDomain}/dev/topology/faces/${slug}/{z}/{x}/{y}`],
      maxzoom: layer?.max_zoom ?? 9,
    };
    layers.push(...buildFaceLayers());
  }

  if (showElements) {
    const elementsTiles =
      slug != null
        ? `${burwellTileDomain}/dev/topology/elements/${slug}/{z}/{x}/{y}`
        : `${burwellTileDomain}/dev/topology/elements/{z}/{x}/{y}`;

    sources.topology = {
      type: "vector",
      tiles: [elementsTiles],
      maxzoom: layer?.max_zoom ?? 9,
    };
    layers.push(...buildTopologyLayers());
  }

  return {
    version: 8,
    sources,
    layers,
  };
}

export function buildFaceLayers() {
  return [
    {
      id: "faces",
      type: "fill",
      source: "faces",
      "source-layer": "map_faces",
      paint: {
        "fill-color": "#c61b9e",
        "fill-opacity": 0.15,
      },
    },
    {
      id: "face-outlines",
      type: "line",
      source: "faces",
      "source-layer": "map_faces",
      paint: {
        "line-color": "#c61b9e",
        "line-width": 1,
        "line-opacity": 0.8,
      },
    },
  ];
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
