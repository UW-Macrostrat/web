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
import { removeMapLabels } from "@macrostrat/mapbox-utils";
import { buildMacrostratStyleLayers } from "@macrostrat/map-styles";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MapMarker,
  FloatingNavbar,
  MapLoadingButton,
  MapAreaContainer,
  LocationPanel,
  MapView,
  FeatureSelectionHandler,
  Features,
  PanelCard,
} from "@macrostrat/map-interface";
import { ExpansionPanel } from "@macrostrat/data-components";
import {
  NonIdealState,
  FormGroup,
  HTMLSelect,
  Button,
  SegmentedControl,
  Switch,
  Callout,
  Tag,
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
  BaseLayerDisclosure,
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

/** Whether the basemap's text labels are shown. On by default; the "off" state
 * is stored in the URL. */
const labelsParamAtom = atomWithSearchParam("labels");
const showLabelsAtom = atom(
  (get) => get(labelsParamAtom) !== "off",
  (get, set, value: boolean) => {
    let param: string | null = null;
    if (!value) param = "off";
    set(labelsParamAtom, param);
  }
);

/** Whether to overlay the live Macrostrat map (the carto_new tileserver layer).
 * Off by default; "on" is stored in the URL. */
const cartoParamAtom = atomWithSearchParam("carto");
const showCartoAtom = atom(
  (get) => get(cartoParamAtom) === "on",
  (get, set, value: boolean) => {
    let param: string | null = null;
    if (value) param = "on";
    set(cartoParamAtom, param);
  }
);

/** Whether to overlay topology-solving errors (the /errors GeoJSON layer).
 * Off by default; "on" is stored in the URL. */
const errorsParamAtom = atomWithSearchParam("errors");
const showErrorsAtom = atom(
  (get) => get(errorsParamAtom) === "on",
  (get, set, value: boolean) => {
    let param: string | null = null;
    if (value) param = "on";
    set(errorsParamAtom, param);
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
  const showLabels = useAtomValue(showLabelsAtom);
  const showCarto = useAtomValue(showCartoAtom);
  const showErrors = useAtomValue(showErrorsAtom);

  // Topology-solving errors are fetched as GeoJSON (small set, ~tens of faces)
  // and scoped to the selected layer, mirroring the /info popup.
  const { data: errors } = useTopologyErrors(selectedLayer?.slug, showErrors);

  const overlayStyles = useMemo(() => {
    const overlays = topologyOverlayStyles(selectedLayer, displayMode, isEnabled);
    // The live Macrostrat map sits beneath the topology overlays.
    if (showCarto) {
      overlays.unshift(cartoStyle());
    }
    // Errors sit on top of everything so they're never hidden by the mode layer.
    if (showErrors && errors != null) {
      overlays.push(errorsStyle(errors));
    }
    return overlays;
  }, [selectedLayer, displayMode, isEnabled, showCarto, showErrors, errors]);

  // Toggle basemap labels by stripping label layers from the resolved style.
  // TODO(upstream): a labels on/off toggle is a common need — consider baking a
  // `showLabels` prop into @macrostrat/map-interface's MapView so each page
  // doesn't re-implement this transformStyle.
  const transformStyle = useCallback(
    (style) => {
      if (showLabels) return style;
      return removeMapLabels(style, true);
    },
    [showLabels]
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
      h(MapInspectorPanel, { position: inspectPosition, features: data })
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
        transformStyle,
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
  const [showCarto, setShowCarto] = useAtom(showCartoAtom);
  const [showErrors, setShowErrors] = useAtom(showErrorsAtom);
  const [showLabels, setShowLabels] = useAtom(showLabelsAtom);

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
    h(Switch, {
      className: "carto-toggle",
      label: "Macrostrat map",
      checked: showCarto,
      onChange: (evt) => setShowCarto(evt.currentTarget.checked),
    }),
    h(Switch, {
      className: "errors-toggle",
      label: "Topology errors",
      checked: showErrors,
      onChange: (evt) => setShowErrors(evt.currentTarget.checked),
    }),
    warning,
    h(BaseLayerDisclosure, { basemap, setBasemap, showLabels, setShowLabels }),
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

/** A row from /dev/topology/info: a map present at the clicked point within a
 * topology layer. `map_face_id` is non-null when that map forms the visible face
 * there — i.e. it's the active map for that layer at this point. */
interface TopologyInfoRow {
  source_id: number;
  priority: number;
  map_layer: string;
  layer_name: string;
  name: string;
  slug: string;
  scale: string | null;
  is_composite: boolean;
  map_face_id: number | null;
}

interface TopologyInfoState {
  loading: boolean;
  data: TopologyInfoRow[] | null;
  error: Error | null;
}

/** Fetch /dev/topology/info for a clicked point, scoped to a map layer when one
 * is selected. Uses a raw fetch (like the layers list) since the tileserver
 * isn't the configured API-provider host. */
function useTopologyInfo(
  position: mapboxgl.LngLat | null,
  mapLayer: string | null
): TopologyInfoState {
  const [state, setState] = useState<TopologyInfoState>({
    loading: false,
    data: null,
    error: null,
  });

  useEffect(() => {
    if (position == null) {
      setState({ loading: false, data: null, error: null });
      return;
    }

    const controller = new AbortController();
    setState({ loading: true, data: null, error: null });

    const params = new URLSearchParams({
      lng: String(position.lng),
      lat: String(position.lat),
    });
    if (mapLayer != null) params.set("map_layer", mapLayer);

    fetch(`${burwellTileDomain}/dev/topology/info?${params}`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load info: ${res.statusText}`);
        }
        return res.json();
      })
      .then((data) => setState({ loading: false, data, error: null }))
      .catch((error) => {
        if (error.name === "AbortError") return;
        setState({ loading: false, data: null, error });
      });

    return () => controller.abort();
  }, [position?.lng, position?.lat, mapLayer]);

  return state;
}

/** A GeoJSON FeatureCollection of topology-solving error faces, as returned by
 * /dev/topology/errors. Each feature's properties carry the source map and the
 * error text. */
interface ErrorsCollection {
  type: "FeatureCollection";
  features: any[];
}

interface TopologyErrorsState {
  loading: boolean;
  data: ErrorsCollection | null;
  error: Error | null;
}

/** Fetch /dev/topology/errors as GeoJSON, scoped to a map layer when one is
 * selected (matching the /info popup). Only fetches while `enabled`. Uses a raw
 * fetch like the layers list, since the tileserver isn't the API-provider host. */
function useTopologyErrors(
  mapLayer: string | null | undefined,
  enabled: boolean
): TopologyErrorsState {
  const [state, setState] = useState<TopologyErrorsState>({
    loading: false,
    data: null,
    error: null,
  });

  useEffect(() => {
    if (!enabled) {
      setState({ loading: false, data: null, error: null });
      return;
    }

    const controller = new AbortController();
    setState({ loading: true, data: null, error: null });

    const params = new URLSearchParams();
    if (mapLayer != null) params.set("map_layer", mapLayer);
    const query = params.toString();

    fetch(`${burwellTileDomain}/dev/topology/errors${query ? `?${query}` : ""}`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load errors: ${res.statusText}`);
        }
        return res.json();
      })
      .then((data) => setState({ loading: false, data, error: null }))
      .catch((error) => {
        if (error.name === "AbortError") return;
        setState({ loading: false, data: null, error });
      });

    return () => controller.abort();
  }, [mapLayer, enabled]);

  return state;
}

/** Vector-tile (and GeoJSON) sources rendered by this page; everything else
 * queried at the click point is basemap noise we keep out of the callouts. */
const TOPOLOGY_SOURCES = new Set(["maps", "faces", "topology", "errors"]);

function MapInspectorPanel({ position, features }) {
  return h("div.map-inspector", [
    h(ErrorFeaturesCallout, { features }),
    h(TopologyMapsList, { position }),
    h(TileFeaturesCallout, { features }),
  ]);
}

/** Topology-solving errors at the click point: each clicked error face shows
 * its source map (linked) and the topology_error text. Only the `errors`
 * GeoJSON source contributes here; absent when no error face was clicked. */
function ErrorFeaturesCallout({ features }) {
  let errors = null;
  if (features != null) {
    errors = features.filter((f) => f.source === "errors");
  }

  if (errors == null || errors.length === 0) return null;

  // A clicked point can hit overlapping error faces; de-duplicate by face id.
  const seen = new Set<number>();
  const items = [];
  for (const f of errors) {
    const p = f.properties ?? {};
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    items.push(
      h("li.error-item", { key: p.id }, [
        h(Link, { href: `/maps/${p.map_id}` }, [
          h("span.name", p.name),
          " ",
          h("code.id", p.map_id),
        ]),
        h("p.error-message", p.topology_error),
      ])
    );
  }

  return h(
    Callout,
    {
      className: "error-features",
      intent: "danger",
      icon: "error",
      title: "Topology errors",
    },
    h("ul.error-list", items)
  );
}

/** Maps present at the clicked point (from /dev/topology/info), grouped by
 * topology layer, with the active map (the one forming the face) tagged. */
function TopologyMapsList({ position }: { position: mapboxgl.LngLat }) {
  const layerSlug = useAtomValue(selectedLayerSlugAtom);
  const { loading, data, error } = useTopologyInfo(position, layerSlug);

  if (loading) return h(Spinner);
  if (error != null) return h(ErrorCallout, { error });
  if (data == null || data.length === 0) {
    return h(NonIdealState, { icon: "map", title: "No maps here" });
  }

  // Group rows by topology layer, preserving the API's priority ordering.
  const groups = new Map<string, TopologyInfoRow[]>();
  for (const row of data) {
    let rows = groups.get(row.map_layer);
    if (rows == null) {
      rows = [];
      groups.set(row.map_layer, rows);
    }
    rows.push(row);
  }

  return h(
    "div.topology-maps",
    Array.from(groups.values()).map((rows) =>
      h(TopologyLayerGroup, { key: rows[0].map_layer, rows })
    )
  );
}

function TopologyLayerGroup({ rows }: { rows: TopologyInfoRow[] }) {
  // Highest priority first.
  const sorted = [...rows].sort((a, b) => b.priority - a.priority);
  return h("div.topology-layer-group", [
    h("h3.layer-name", sorted[0].layer_name),
    h(
      "ul.map-list",
      sorted.map((row) => h(TopologyMapItem, { key: row.source_id, map: row }))
    ),
  ]);
}

function TopologyMapItem({ map }: { map: TopologyInfoRow }) {
  let activeTag = null;
  if (map.map_face_id != null) {
    activeTag = h(
      Tag,
      { minimal: true, round: true, intent: "success" },
      "active"
    );
  }

  let scale = null;
  if (map.scale != null) {
    scale = h("span.scale", ` ${map.scale}`);
  }

  return h("li.map-item", [
    h("span.priority", { title: "Priority" }, map.priority),
    h(Link, { href: `/maps/${map.source_id}` }, [
      h("span.name", map.name),
      " ",
      h("code.id", map.source_id),
    ]),
    scale,
    activeTag,
  ]);
}

/** The raw vector-tile features at the click point, shown as collapsible
 * primitive properties via the shared dev feature-display components. */
function TileFeaturesCallout({ features }) {
  let primitives = null;
  if (features != null) {
    primitives = features.filter((f) => TOPOLOGY_SOURCES.has(f.source));
  }

  if (primitives == null || primitives.length === 0) return null;

  return h(
    ExpansionPanel,
    {
      title: "Tile features",
      className: styles["tile-features"],
      expanded: false,
    },
    h(Features, { features: primitives })
  );
}

/** The live Macrostrat geologic map, built from the carto_new tileserver layer
 * (the "carto v2" tileset). The source must be named "burwell" — that's what
 * buildMacrostratStyleLayers targets (source-layers `units` and `lines`). */
function cartoStyle(): mapboxgl.Style {
  return {
    version: 8,
    sources: {
      burwell: {
        type: "vector",
        tiles: [`${burwellTileDomain}/dev/carto/{z}/{x}/{y}`],
      },
    },
    layers: buildMacrostratStyleLayers({
      fillOpacity: 0.4,
      strokeOpacity: 0.4,
      lineOpacity: 0.8,
    }),
  };
}

/** Topology-solving error faces, drawn from a GeoJSON source (the small /errors
 * FeatureCollection rather than vector tiles) so they can be clicked for the
 * error text. Distinct red, with a heavier outline so small faces stay visible. */
function errorsStyle(data: ErrorsCollection): mapboxgl.Style {
  const color = "#e5340b";
  return {
    version: 8,
    sources: {
      errors: {
        type: "geojson",
        data,
      },
    },
    layers: [
      {
        id: "errors-fill",
        type: "fill",
        source: "errors",
        paint: {
          "fill-color": color,
          "fill-opacity": 0.25,
        },
      },
      {
        id: "errors-outline",
        type: "line",
        source: "errors",
        paint: {
          "line-color": color,
          "line-width": 2,
        },
      },
    ],
  };
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
        "line-width": ["interpolate", ["linear"], ["zoom"], 0, 0.5, 12, 1.5],
        "line-color": "#606ad9", // "#4f11ab",
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
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 0, 1, 12, 3],
        "circle-color": "#606ad9",
      },
    },
  ];
}
