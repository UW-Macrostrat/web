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
 * - Maps: /maps/{z}/{x}/{y} - constituent map boundaries
 *         /maps/{layer}/{z}/{x}/{y} - constituent map boundaries for a specific layer
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
  Radio,
  RadioGroup,
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

/** Which polygon overlay to render. Faces and maps are mutually exclusive;
 * both carry the source info that powers the contextual click panel. Faces
 * require a selected layer, so "maps" is the default and the whole-topology
 * fallback. */
type PolygonOverlay = "faces" | "maps";
const polygonOverlayAtom = atom<PolygonOverlay>("maps");

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
  const polygonOverlay = useAtomValue(polygonOverlayAtom);

  const overlayStyles = useMemo(
    () =>
      topologyOverlayStyles(
        selectedLayer,
        { showElements, polygonOverlay },
        isEnabled
      ),
    [selectedLayer, showElements, polygonOverlay, isEnabled]
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
  const [polygonOverlay, setPolygonOverlay] = useAtom(polygonOverlayAtom);

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

  // Faces require a selected layer; without one we always fall back to maps.
  const hasLayer = selectedSlug != null;
  const polygonValue = hasLayer ? polygonOverlay : "maps";

  return h("div.layer-selector", [
    layerControl,
    h(
      RadioGroup,
      {
        label: "Polygons",
        inline: true,
        selectedValue: polygonValue,
        onChange: (evt) =>
          setPolygonOverlay(evt.currentTarget.value as PolygonOverlay),
      },
      [
        h(Radio, { label: "Faces", value: "faces", disabled: !hasLayer }),
        h(Radio, { label: "Maps", value: "maps" }),
      ]
    ),
    h(Switch, {
      label: "Show elements",
      checked: showElements,
      onChange: (evt) => setShowElements(evt.currentTarget.checked),
    }),
  ]);
}

function MapInspectorPanel({ features }) {
  // Both the maps and faces sources carry the same source info; a single map
  // can span many faces, so dedupe by source_id.
  const seen = new Set();
  let maps = features
    ?.filter((d) => d.source == "maps" || d.source == "faces")
    ?.map((d) => d.properties)
    ?.filter((p) => {
      if (seen.has(p.source_id)) return false;
      seen.add(p.source_id);
      return true;
    });

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
  return h("li", [
    h(Link, { href: `/maps/${map.source_id}` }, [
      h("span.name", map.name),
      " ",
      h("code.id", map.source_id),
    ]),
    map.scale != null ? h("span.scale", ` ${map.scale}`) : null,
  ]);
}

interface TopologyOverlayOptions {
  showElements: boolean;
  polygonOverlay: PolygonOverlay;
}

/** Build the list of independent overlay styles for the current selection.
 *
 * Styles are kept independent (rather than merged into one) so they can be
 * layered and toggled separately, ordered bottom-to-top. The polygon overlay
 * is either faces or maps (mutually exclusive); faces require a selected layer,
 * so we fall back to maps for the whole topology. Topology elements render on
 * top when enabled.
 */
function topologyOverlayStyles(
  layer: TopologyLayer | null,
  { showElements, polygonOverlay }: TopologyOverlayOptions,
  darkMode: boolean
): mapboxgl.Style[] {
  const overlays: mapboxgl.Style[] = [];

  if (polygonOverlay === "faces" && layer != null) {
    overlays.push(facesStyle(layer));
  } else {
    overlays.push(mapsStyle(layer, darkMode));
  }

  if (showElements) {
    overlays.push(elementsStyle(layer));
  }
  return overlays;
}

/** Constituent map boundaries, styled like the rgeom bounds on /dev/map/sources.
 * Clicking these features powers the contextual info panel. */
function mapsStyle(
  layer: TopologyLayer | null,
  darkMode: boolean
): mapboxgl.Style {
  const slug = layer?.slug;
  const tiles =
    slug != null
      ? `${burwellTileDomain}/dev/topology/maps/${slug}/{z}/{x}/{y}`
      : `${burwellTileDomain}/dev/topology/maps/{z}/{x}/{y}`;

  const color = darkMode ? 255 : 20;

  return {
    version: 8,
    sources: {
      maps: {
        type: "vector",
        tiles: [tiles],
        maxzoom: layer?.max_zoom ?? 9,
      },
    },
    layers: [
      {
        id: "maps",
        type: "fill",
        source: "maps",
        "source-layer": "maps",
        paint: {
          "fill-color": `rgba(${color}, ${color}, ${color}, 0.1)`,
        },
      },
      {
        id: "maps-line",
        type: "line",
        source: "maps",
        "source-layer": "maps",
        paint: {
          "line-color": `rgba(${color}, ${color}, ${color}, 0.5)`,
          "line-width": 1,
        },
      },
    ],
  };
}

function facesStyle(layer: TopologyLayer): mapboxgl.Style {
  return {
    version: 8,
    sources: {
      faces: {
        type: "vector",
        tiles: [
          `${burwellTileDomain}/dev/topology/faces/${layer.slug}/{z}/{x}/{y}`,
        ],
        maxzoom: layer.max_zoom ?? 9,
      },
    },
    layers: buildFaceLayers(),
  };
}

function elementsStyle(layer: TopologyLayer | null): mapboxgl.Style {
  const slug = layer?.slug;
  const tiles =
    slug != null
      ? `${burwellTileDomain}/dev/topology/elements/${slug}/{z}/{x}/{y}`
      : `${burwellTileDomain}/dev/topology/elements/{z}/{x}/{y}`;

  return {
    version: 8,
    sources: {
      topology: {
        type: "vector",
        tiles: [tiles],
        maxzoom: layer?.max_zoom ?? 9,
      },
    },
    layers: buildTopologyLayers(),
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
