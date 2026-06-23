/** Management interface for the Macrostrat map topology.
 *
 * All API routes are at tiles.{macrostrat_instance}/dev/topology...
 *
 * List layers: /layers
 *
 * Tile routes:
 * - Faces: /faces/{layer}/{z}/{x}/{y} - map_faces for a specific map layer
 *          /faces/{z}/{x}/{y} - topology primitive faces for the whole topology
 * - Elements: /elements/{z}/{x}/{y} - edges, nodes for the whole topology
 *             /elements/{layer}/{z}/{x}/{y} - edges, nodes for a specific map layer
 * - Maps: /maps/{z}/{x}/{y} - constituent map boundaries
 *         /maps/{layer}/{z}/{x}/{y} - constituent map boundaries for a specific layer
 *
 *  The {layer} path segment is a map layer's `slug` (e.g. "tiny", "carto-small").
 *
 *  Info: /info?lng=<lng>&lat=<lat>[&map_layer=<slug>]
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
  Button,
  Collapse,
  SegmentedControl,
  Callout,
  Spinner,
} from "@blueprintjs/core";
import { atom, useAtom, useAtomValue } from "jotai";
import { loadable } from "jotai/utils";
import { atomWithLocation } from "jotai-location";
import {
  Link,
  PageBreadcrumbsInternal,
  PageTitle,
  usePageBreadcrumbs,
  BaseLayerSelector,
  Basemap,
  basemapStyle,
} from "~/components";
import styles from "./main.module.scss";

const h = hyper.styled(styles);

/** Shared width for the floating navbar and the context panel below it. */
const PANEL_WIDTH = 320;

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

/** Map state synced to the URL query string, so the current view (selected
 * layer, polygon overlay) can be recovered from a shared/bookmarked link. */
const locationAtom = atomWithLocation({ replace: true });

/** Derive a read/write atom backed by a single URL query parameter. Writing
 * null (or "") removes the parameter, keeping default views out of the URL. */
function atomWithSearchParam(key: string) {
  return atom(
    (get) => get(locationAtom).searchParams?.get(key) ?? null,
    (get, set, value: string | null) => {
      const loc = get(locationAtom);
      const searchParams = new URLSearchParams(loc.searchParams);
      if (value == null || value === "") {
        searchParams.delete(key);
      } else {
        searchParams.set(key, value);
      }
      set(locationAtom, { ...loc, searchParams });
    }
  );
}

/** The slug of the selected map layer, or null for the whole topology. */
const selectedLayerSlugAtom = atomWithSearchParam("layer");

/** The map's display mode — three mutually exclusive views onto the same
 * topology:
 *  - "maps":  footprints of the source maps compiled into the layer
 *  - "faces": topological faces (polygons built from the edge network)
 *  - "edges": raw topology elements (edges and their nodes)
 */
type DisplayMode = "maps" | "faces" | "edges";
const DEFAULT_MODE: DisplayMode = "maps";
const displayModeParamAtom = atomWithSearchParam("mode");
const displayModeAtom = atom(
  (get): DisplayMode => {
    const value = get(displayModeParamAtom);
    if (value === "faces" || value === "edges") return value;
    return DEFAULT_MODE;
  },
  (get, set, value: DisplayMode) => {
    // The default mode is kept out of the URL.
    let param: DisplayMode | null = value;
    if (value === DEFAULT_MODE) param = null;
    set(displayModeParamAtom, param);
  }
);

/** User-facing label and explanatory text for each display mode. */
interface DisplayModeInfo {
  value: DisplayMode;
  label: string;
  description: string;
}
const DISPLAY_MODES: DisplayModeInfo[] = [
  {
    value: "maps",
    label: "Maps",
    description: "Footprints of the source maps compiled into this layer.",
  },
  {
    value: "faces",
    label: "Faces",
    description: "Topological faces — polygons built from the edge network.",
  },
  {
    value: "edges",
    label: "Edges",
    description: "Raw topology elements: edges and their nodes.",
  },
];

/** The base map style, persisted in the URL (parallel to the main map page).
 * "basic" is the default and is kept out of the query string. */
const basemapParamAtom = atomWithSearchParam("basemap");
const basemapAtom = atom(
  (get): Basemap => {
    const value = get(basemapParamAtom);
    if (value === Basemap.Satellite || value === Basemap.None) {
      return value as Basemap;
    }
    return Basemap.Basic;
  },
  (get, set, value: Basemap) => {
    let param: Basemap | null = value;
    if (value === Basemap.Basic) param = null;
    set(basemapParamAtom, param);
  }
);

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

  const basemap = useAtomValue(basemapAtom);
  const baseStyle = basemapStyle(basemap, isEnabled);

  const [isOpen, setOpen] = useState(true);

  const [inspectPosition, setInspectPosition] =
    useState<mapboxgl.LngLat | null>(null);

  const [data, setData] = useState(null);

  const selectedLayer = useAtomValue(selectedLayerAtom);
  const displayMode = useAtomValue(displayModeAtom);

  const overlayStyles = useMemo(
    () => topologyOverlayStyles(selectedLayer, displayMode, isEnabled),
    [selectedLayer, displayMode, isEnabled]
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

  // Mirror the navbar width. PanelCard doesn't expose a flexible width, so we
  // set it here until that can be addressed upstream in map-interface.
  const contextPanel = h(
    PanelCard,
    { style: { width: PANEL_WIDTH } },
    h(LayerSelectorPanel)
  );

  return h(
    MapAreaContainer,
    {
      navbar: h(
        FloatingNavbar,
        { className: styles["topology-navbar"], width: PANEL_WIDTH },
        h(NavbarHeader, {
          isOpen,
          onToggle: () => setOpen(!isOpen),
        })
      ),
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

/** Navbar header: a collapsing breadcrumb trail on top, with the page title
 * and the panel toggle on a row below it. */
function NavbarHeader({
  isOpen,
  onToggle,
}: {
  isOpen: boolean;
  onToggle: () => void;
}) {
  // Drop the leaf (the current page) from the trail; it's shown as the title.
  const trail = usePageBreadcrumbs().slice(0, -1);

  return h("div.navbar-header", [
    h(PageBreadcrumbsInternal, {
      items: trail,
      showLogo: true,
      separateTitle: false,
    }),
    h("div.title-row", [
      h(PageTitle, { headingLevel: 2 }),
      h(Spacer),
      h(MapLoadingButton, { active: isOpen, onClick: onToggle, large: false }),
    ]),
  ]);
}

function LayerSelectorPanel() {
  const layers = useAtomValue(layersLoadableAtom);
  const [selectedSlug, setSelectedSlug] = useAtom(selectedLayerSlugAtom);
  const [mode, setMode] = useAtom(displayModeAtom);
  const [basemap, setBasemap] = useAtom(basemapAtom);

  let layerControl = null;
  if (layers.state === "loading") {
    layerControl = h(Spinner);
  } else if (layers.state === "hasError") {
    layerControl = h(ErrorCallout, { error: layers.error });
  } else {
    const options = layers.data.map((layer) => ({
      label: layer.name,
      value: layer.slug,
    }));

    layerControl = h(
      FormGroup,
      { label: "Map layer", className: "layer-field" },
      h(NullableDropdown, {
        options,
        value: selectedSlug,
        onChange: setSelectedSlug,
        placeholder: "Select a layer…",
      })
    );
  }

  const hasLayer = selectedSlug != null;

  // Only the active mode's description is shown, beneath the segmented control.
  const activeMode = DISPLAY_MODES.find((m) => m.value === mode);

  let warning = null;
  if (!hasLayer) {
    warning = h(WholeTopologyWarning, { mode });
  }

  return h("div.layer-selector", [
    layerControl,
    h(FormGroup, { label: "Display mode", className: "mode-field" }, [
      h(SegmentedControl, {
        fill: true,
        small: true,
        options: DISPLAY_MODES.map((m) => ({ label: m.label, value: m.value })),
        value: mode,
        onValueChange: (value) => setMode(value as DisplayMode),
      }),
      h("p.mode-description", activeMode?.description),
    ]),
    warning,
    h(BaseLayerDisclosure, { basemap, setBasemap }),
  ]);
}

/** A select that can be cleared back to null via an adjacent close button. The
 * leading placeholder option represents the null state within the dropdown. */
function NullableDropdown({ options, value, onChange, placeholder = "—" }) {
  const allOptions = [{ label: placeholder, value: "" }, ...options];
  return h("div.nullable-dropdown", [
    h(HTMLSelect, {
      fill: true,
      options: allOptions,
      value: value ?? "",
      onChange: (evt) => onChange(evt.target.value || null),
    }),
    h(Button, {
      icon: "cross",
      minimal: true,
      disabled: value == null,
      "aria-label": "Clear selection",
      onClick: () => onChange(null),
    }),
  ]);
}

/** Slim, low-key disclosure for the base-layer selector — it should escape
 * attention until opened. */
function BaseLayerDisclosure({ basemap, setBasemap }) {
  const [isOpen, setOpen] = useState(false);

  let chevron = "chevron-down";
  if (isOpen) chevron = "chevron-up";

  return h("div.base-layer-disclosure", [
    h(Button, {
      className: "base-layer-toggle",
      text: "Base layer",
      minimal: true,
      small: true,
      fill: true,
      alignText: "left",
      rightIcon: chevron,
      onClick: () => setOpen(!isOpen),
    }),
    h(
      Collapse,
      { isOpen },
      h(BaseLayerSelector, {
        layer: basemap,
        setLayer: setBasemap,
        showTitle: false,
      })
    ),
  ]);
}

/** Shown when no layer is selected: whole-topology views still render, but we
 * nudge the user to pick a layer and warn that on-the-fly primitive faces are
 * slow at low zoom. */
function WholeTopologyWarning({ mode }: { mode: DisplayMode }) {
  let facesNote = null;
  if (mode === "faces") {
    facesNote = h(
      "p",
      "Primitive faces for the whole topology are computed on the fly and can be slow to load, especially at low zoom."
    );
  }

  return h(
    Callout,
    {
      className: "whole-topology-warning",
      intent: "warning",
      icon: "warning-sign",
      title: "No layer selected",
    },
    [
      h(
        "p",
        "Showing the whole topology. Select a map layer to focus on a single compilation."
      ),
      facesNote,
    ]
  );
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
  let scale = null;
  if (map.scale != null) {
    scale = h("span.scale", ` ${map.scale}`);
  }

  return h("li", [
    h(Link, { href: `/maps/${map.source_id}` }, [
      h("span.name", map.name),
      " ",
      h("code.id", map.source_id),
    ]),
    scale,
  ]);
}

/** Build the overlay style(s) for the active display mode. Each mode is a
 * single, mutually-exclusive view; every style handles a null layer by falling
 * back to its whole-topology tile route. */
function topologyOverlayStyles(
  layer: TopologyLayer | null,
  mode: DisplayMode,
  darkMode: boolean
): mapboxgl.Style[] {
  switch (mode) {
    case "maps":
      return [mapsStyle(layer, darkMode)];
    case "faces":
      return [facesStyle(layer)];
    case "edges":
      return [elementsStyle(layer)];
  }
}

/** Constituent map boundaries, styled like the rgeom bounds on /dev/map/sources.
 * Clicking these features powers the contextual info panel. */
function mapsStyle(
  layer: TopologyLayer | null,
  darkMode: boolean
): mapboxgl.Style {
  const slug = layer?.slug;

  let tiles = `${burwellTileDomain}/dev/topology/maps/{z}/{x}/{y}`;
  if (slug != null) {
    tiles = `${burwellTileDomain}/dev/topology/maps/${slug}/{z}/{x}/{y}`;
  }

  let color = 20;
  if (darkMode) color = 255;

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

/** Faces overlay. With a layer selected this serves that layer's `map_faces`;
 * with no layer it serves the whole-topology primitive faces (slower). The two
 * routes emit different MVT source-layers (`map_faces` vs `faces`). */
function facesStyle(layer: TopologyLayer | null): mapboxgl.Style {
  // Whole-topology primitive faces borrow the purple of the "edges" mode to
  // signal they belong to the topology itself, not the magenta map-face
  // compilation; they also come from a different route and MVT source-layer.
  let tiles = `${burwellTileDomain}/dev/topology/faces/{z}/{x}/{y}`;
  let sourceLayer = "faces";
  let color = "#4f11ab";
  if (layer != null) {
    tiles = `${burwellTileDomain}/dev/topology/faces/${layer.slug}/{z}/{x}/{y}`;
    sourceLayer = "map_faces";
    color = "#c61b9e";
  }

  return {
    version: 8,
    sources: {
      faces: {
        type: "vector",
        tiles: [tiles],
        maxzoom: layer?.max_zoom ?? 9,
      },
    },
    layers: buildFaceLayers(sourceLayer, color),
  };
}

function elementsStyle(layer: TopologyLayer | null): mapboxgl.Style {
  const slug = layer?.slug;

  let tiles = `${burwellTileDomain}/dev/topology/elements/{z}/{x}/{y}`;
  if (slug != null) {
    tiles = `${burwellTileDomain}/dev/topology/elements/${slug}/{z}/{x}/{y}`;
  }

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

export function buildFaceLayers(sourceLayer = "map_faces", color = "#c61b9e") {
  return [
    {
      id: "faces",
      type: "fill",
      source: "faces",
      "source-layer": sourceLayer,
      paint: {
        "fill-color": color,
        "fill-opacity": 0.15,
      },
    },
    {
      id: "face-outlines",
      type: "line",
      source: "faces",
      "source-layer": sourceLayer,
      paint: {
        "line-color": color,
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
    // Nodes. The nodes source-layer carries geometry only (the topo-primitives
    // queries group by geom and emit no attributes), so there's nothing to sort
    // or data-drive on here.
    {
      id: "nodes",
      type: "circle",
      source: "topology",
      "source-layer": "nodes",
      "min-zoom": 4,
      paint: {
        // Small radius when zoomed out and larger when zoomed in
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 0, 0.5, 12, 3],
        "circle-color": "#606ad9",
      },
    },
  ];
}
