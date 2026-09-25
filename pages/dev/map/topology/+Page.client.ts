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
import { removeMapLabels, type MapPosition } from "@macrostrat/mapbox-utils";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MapMarker,
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
  SegmentedControl,
  Switch,
  Callout,
  Tag,
  Spinner,
} from "@blueprintjs/core";
import { atom, useAtom, useAtomValue } from "jotai";
import { loadable } from "jotai/utils";
import { atomWithSearchParam } from "~/_utils/url-atoms";
import { macrostratCartoStyle } from "~/_utils/map-layers";
import { lastMapPositionAtom } from "~/_utils/last-map-position";
import { Link, BaseLayerForm, Basemap, basemapStyle } from "~/components";
import {
  CompilationPath,
  CompilationSelector,
  CompilationSummary,
  compilationTreeAtoms,
  fetchCompilationGraph,
  graphValueAtom,
  type GraphNode,
} from "~/components/compilation-tree";
import { MapPageNavbar } from "~/components/map-navbar/map-page-navbar";
import styles from "./main.module.scss";

const h = hyper.styled(styles);

/** Shared width for the floating navbar and the context panel below it. The
 * tree needs more room than the dropdown it replaced. */
const PANEL_WIDTH = 400;

/** The compilation graph, fetched once on the client.
 *
 * This replaces the former `/dev/topology/layers` fetch outright: a served layer
 * *is* a compilation, so the layers are in here as the graph's roots, carrying
 * the same zoom ranges. The tree's top level is what the dropdown used to hold.
 *
 * The page is client-rendered, so there is no `+data.ts` to load this on the
 * server the way the compilations browser does; an async atom is the same thing
 * one render later. The graph is a few hundred nodes and edges — small enough to
 * hold whole, which is what lets the tree search across the entire hierarchy
 * rather than only what has been expanded.
 */
const graphLoadableAtom = loadable(
  atom((get, { signal }) => fetchCompilationGraph({ signal }))
);

const graphAtom = graphValueAtom(graphLoadableAtom);

/** The map camera. Uses the shared last-viewed-location atom
 * (`~/_utils/last-map-position`), so the view is carried across all map pages
 * (e.g. from the main /map) and restored on revisit — deliberately NOT synced to
 * the URL (per-device "resume where I left off", not shareable link state), and
 * ignored once stale (see the atom's staleness rule). */
const mapPositionAtom = lastMapPositionAtom;

/** The selected compilation, by slug — or null for the whole topology.
 *
 * Any compilation is addressable, not only a served layer: the `maps` and
 * `faces` tile routes resolve the slug through `map_bounds.source_id()`, so
 * `bc-surface` loads exactly the way `carto-large` does. The parameter keeps its
 * `layer` name, since a layer slug still means what it always meant and existing
 * links should keep working.
 */
const selectedSlugAtom = atomWithSearchParam("layer");

const treeAtoms = compilationTreeAtoms({
  graph: graphAtom,
  focusSlug: selectedSlugAtom,
});

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

/** The selected node, resolved from the graph. */
const selectedNodeAtom = treeAtoms.focusNode;

/** The served layer a selection is drawn from.
 *
 * Faces are materialized per served layer, so a compilation that is not one
 * borrows its containing layer's faces. The routes that are still layer-scoped
 * — `/elements`, `/info`, `/errors` — need that layer's slug rather than the
 * compilation's, which they resolve to nothing and answer with silence.
 */
const servedLayerAtom = atom<GraphNode | null>((get) => {
  const node = get(selectedNodeAtom);
  if (node == null) return null;
  if (node.has_faces) return node;

  const layerId = node.placed_in_layer_id;
  if (layerId == null) return null;
  return get(graphAtom).nodes.find((n) => n.map_layer_id === layerId) ?? null;
});

/** Tiles are cached to the layer's maximum zoom; past it Mapbox overzooms the
 * last level rather than asking for one that does not exist. */
function maxZoomFor(layer: GraphNode | null): number {
  return layer?.max_zoom ?? 9;
}

export function Page() {
  const dark = useDarkMode();
  const isEnabled = dark?.isEnabled;

  const basemap = useAtomValue(basemapAtom);
  const baseStyle = basemapStyle(basemap, isEnabled);

  // Restore the last-viewed camera from localStorage, and persist it on move.
  const [mapPosition, setMapPosition] = useAtom(mapPositionAtom);

  const [isOpen, setOpen] = useState(true);

  const [inspectPosition, setInspectPosition] =
    useState<mapboxgl.LngLat | null>(null);

  const [data, setData] = useState(null);

  const selectedSlug = useAtomValue(selectedSlugAtom);
  const servedLayer = useAtomValue(servedLayerAtom);
  const displayMode = useAtomValue(displayModeAtom);
  const showLabels = useAtomValue(showLabelsAtom);
  const showCarto = useAtomValue(showCartoAtom);
  const showErrors = useAtomValue(showErrorsAtom);

  // Topology-solving errors are fetched as GeoJSON (small set, ~tens of faces)
  // and scoped to the selected layer, mirroring the /info popup.
  const { data: errors } = useTopologyErrors(servedLayer?.slug, showErrors);

  const overlayStyles = useMemo(() => {
    const overlays = topologyOverlayStyles(
      selectedSlug,
      servedLayer,
      displayMode,
      isEnabled
    );
    // The live Macrostrat map sits beneath the topology overlays.
    if (showCarto) {
      overlays.unshift(macrostratCartoStyle());
    }
    // Errors sit on top of everything so they're never hidden by the mode layer.
    if (showErrors && errors != null) {
      overlays.push(errorsStyle(errors));
    }
    return overlays;
  }, [
    selectedSlug,
    servedLayer,
    displayMode,
    isEnabled,
    showCarto,
    showErrors,
    errors,
  ]);

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

  const onMapMoved = useCallback(
    (pos: MapPosition) => setMapPosition(pos),
    [setMapPosition]
  );

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
    h(CompilationSelectorPanel)
  );

  return h(
    MapAreaContainer,
    {
      navbar: h(MapPageNavbar, {
        isOpen,
        onToggle: () => setOpen(!isOpen),
        width: PANEL_WIDTH,
      }),
      contextPanel,
      detailPanel: detailElement,
      contextPanelOpen: isOpen,
    },
    h(
      MapView,
      {
        style: baseStyle,
        mapPosition,
        onMapMoved,
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

/** The context panel: what to show, and how to draw it.
 *
 * The compilation tree replaces the layer dropdown this page used to carry.
 * Served layers are the tree's roots, so everything the dropdown offered is
 * still one click away — but a compilation below one (`bc-surface`, `sgmc`, a
 * single ingested map) is now just as selectable, which is the whole point:
 * resolved faces were only ever viewable for the seven served layers.
 */
function CompilationSelectorPanel() {
  const [mode, setMode] = useAtom(displayModeAtom);
  const [basemap, setBasemap] = useAtom(basemapAtom);
  const [showCarto, setShowCarto] = useAtom(showCartoAtom);
  const [showErrors, setShowErrors] = useAtom(showErrorsAtom);
  const [showLabels, setShowLabels] = useAtom(showLabelsAtom);

  // Only the active mode's description is shown, beneath the segmented control.
  const activeMode = DISPLAY_MODES.find((m) => m.value === mode);

  return h("div.layer-selector", [
    h(CompilationField),
    h(SelectionNote, { mode }),
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
    h(BaseLayerForm, { basemap, setBasemap, showLabels, setShowLabels }),
  ]);
}

/** What is being shown, and the control for changing it.
 *
 * The hierarchy is hundreds of nodes and belongs behind a popover; what earns
 * permanent space in the panel is the selection itself — the route down to it,
 * and the derived facts that say what it is. */
function CompilationField() {
  const graph = useAtomValue(graphLoadableAtom);

  // The popover shows the graph's state in place of the tree, so the button is
  // there to press from the first render.
  let status = null;
  if (graph.state === "loading") {
    status = h("div.tree-status", h(Spinner, { size: 20 }));
  } else if (graph.state === "hasError") {
    status = h("div.tree-status", h(ErrorCallout, { error: graph.error }));
  }

  return h("div.compilation-field", [
    h("label.field-label", "Compilation"),
    h(CompilationPath, { atoms: treeAtoms }),
    h(CompilationSelector, {
      atoms: treeAtoms,
      status,
      // Standalone maps are ingested maps in no compilation — a real part of the
      // catalog, and addressable by the tile routes like anything else, so they
      // stay reachable here.
      showStandalone: true,
      placeholder: "Whole topology",
    }),
    h(CompilationSummary, { atoms: treeAtoms }),
  ]);
}

/** What the current selection means for the mode in view.
 *
 * Three of the routes behind this page are still layer-scoped, so a selection
 * below a served layer is answered at the layer's level rather than the
 * compilation's. Saying so beats a view that quietly shows the wrong extent.
 */
function SelectionNote({ mode }: { mode: DisplayMode }) {
  const slug = useAtomValue(selectedSlugAtom);
  const node = useAtomValue(selectedNodeAtom);
  const servedLayer = useAtomValue(servedLayerAtom);
  const graph = useAtomValue(graphLoadableAtom);

  if (slug == null) return h(WholeTopologyWarning, { mode });

  // A slug from a bookmarked link that no longer names anything. The tile
  // routes answer it with empty tiles, which reads as "nothing here" rather
  // than "no such compilation".
  if (node == null) {
    if (graph.state !== "hasData") return null;
    return h(
      Callout,
      { className: "selection-note", intent: "warning", icon: "warning-sign" },
      h("p", `No compilation named ${slug}.`)
    );
  }

  if (node.has_faces) return null;
  if (mode !== "edges") return null;

  let layerName = "its containing layer";
  if (servedLayer != null) layerName = servedLayer.name ?? servedLayer.slug;

  return h(
    Callout,
    { className: "selection-note", intent: "primary", icon: "info-sign" },
    h(
      "p",
      `Edges belong to the topology as a whole, so they are shown for ${layerName} rather than for ${
        node.name ?? node.slug
      } alone. Maps and Faces are scoped to the selection.`
    )
  );
}

/** Shown when nothing is selected: whole-topology views still render, but we
 * nudge the user to pick a compilation and warn that on-the-fly primitive faces
 * are slow at low zoom. */
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
      title: "Nothing selected",
    },
    [
      h(
        "p",
        "Showing the whole topology. Select a compilation to focus on what it resolves to."
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
  /** The priority path as a dotted string; `priority_path` is the array. */
  priority: string;
  priority_path: number[];
  map_layer: string;
  map_layer_id: number;
  layer_name: string;
  name: string;
  slug: string;
  scale: string | null;
  is_compilation: boolean;
  is_materialized: boolean;
  is_derived: boolean;
  /** The member of the layer this row belongs to; equal to `source_id` for the
   * row that matches a clicked feature. */
  member_id: number | null;
  member_slug: string | null;
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

    fetch(
      `${burwellTileDomain}/dev/topology/errors${query ? `?${query}` : ""}`,
      {
        signal: controller.signal,
      }
    )
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
        h(Link, { href: `/maps/${p.source_id}` }, [
          h("span.name", p.name),
          " ",
          h("code.id", p.source_id),
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
  // `/info` walks the hierarchy from the served layers down, so it takes the
  // layer a selection sits in rather than the selection itself; the rows it
  // returns already carry every compilation on the way to the point.
  const layerSlug = useAtomValue(servedLayerAtom)?.slug ?? null;
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

function comparePaths(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return a.length - b.length;
}

function TopologyLayerGroup({ rows }: { rows: TopologyInfoRow[] }) {
  // Highest priority first: paths compare lexicographically, deeper wins a tie.
  const sorted = [...rows].sort((a, b) =>
    comparePaths(b.priority_path ?? [], a.priority_path ?? [])
  );
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
 * single, mutually-exclusive view; every style handles a null selection by
 * falling back to its whole-topology tile route.
 *
 * Maps and faces are drawn for whatever is selected — the tile routes take any
 * compilation slug. Edges are a property of the topology itself and are only
 * served per layer, so they fall back to the layer the selection sits in. */
function topologyOverlayStyles(
  slug: string | null,
  servedLayer: GraphNode | null,
  mode: DisplayMode,
  darkMode: boolean
): mapboxgl.Style[] {
  switch (mode) {
    case "maps":
      return [mapsStyle(slug, servedLayer, darkMode)];
    case "faces":
      return [facesStyle(slug, servedLayer)];
    case "edges":
      return [elementsStyle(servedLayer)];
  }
}

/** Constituent map boundaries, styled like the rgeom bounds on /dev/map/sources.
 * Clicking these features powers the contextual info panel. */
function mapsStyle(
  slug: string | null,
  servedLayer: GraphNode | null,
  darkMode: boolean
): mapboxgl.Style {
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
        maxzoom: maxZoomFor(servedLayer),
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

/** Faces overlay. With something selected this serves the faces that
 * compilation resolves to — borrowed from its containing layer's `map_face`
 * rows and filtered to its members, which is what makes `bc-surface` as
 * viewable as `carto-large`. With nothing selected it serves the whole-topology
 * primitive faces (slower). The two routes emit different MVT source-layers
 * (`map_faces` vs `faces`). */
function facesStyle(
  slug: string | null,
  servedLayer: GraphNode | null
): mapboxgl.Style {
  // Whole-topology primitive faces borrow the purple of the "edges" mode to
  // signal they belong to the topology itself, not the magenta map-face
  // compilation; they also come from a different route and MVT source-layer.
  let tiles = `${burwellTileDomain}/dev/topology/faces/{z}/{x}/{y}`;
  let sourceLayer = "faces";
  let color = "#4f11ab";
  if (slug != null) {
    tiles = `${burwellTileDomain}/dev/topology/faces/${slug}/{z}/{x}/{y}`;
    sourceLayer = "map_faces";
    color = "#c61b9e";
  }

  return {
    version: 8,
    sources: {
      faces: {
        type: "vector",
        tiles: [tiles],
        maxzoom: maxZoomFor(servedLayer),
      },
    },
    layers: buildFaceLayers(sourceLayer, color),
  };
}

/** Raw topology elements. `/elements/{layer}` resolves its slug through
 * `map_bounds.layer_id()`, so it answers for served layers only — a compilation
 * below one is drawn at its layer's level, which `SelectionNote` says out loud.
 */
function elementsStyle(servedLayer: GraphNode | null): mapboxgl.Style {
  const slug = servedLayer?.slug;

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
        maxzoom: maxZoomFor(servedLayer),
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
