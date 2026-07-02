/** Cache management interface for Macrostrat's carto tile caches (L1 Varnish + L2 database).
 *
 * Targets are picked on the map: click a constituent-map footprint to expire
 * that map (its scale band), or switch to viewport mode to expire the visible
 * region. The carto map is shown underneath for context. API routes live under
 * tiles.{macrostrat_instance}/cache; state/hooks/helpers live in ./lib.
 */

import hyper from "@macrostrat/hyper";
import { mapboxAccessToken } from "@macrostrat-web/settings";
import { Spacer, useDarkMode } from "@macrostrat/ui-components";
import { useMapClickHandler, useMapRef } from "@macrostrat/mapbox-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FloatingNavbar,
  MapLoadingButton,
  MapAreaContainer,
  MapView,
  PanelCard,
} from "@macrostrat/map-interface";
import {
  FormGroup,
  Button,
  SegmentedControl,
  Callout,
  Intent,
  Tag,
  Switch,
  NumericInput,
} from "@blueprintjs/core";
import { useAtom, useAtomValue } from "jotai";
import {
  PageBreadcrumbsInternal,
  PageTitle,
  usePageBreadcrumbs,
  BaseLayerForm,
  basemapStyle,
} from "~/components";
import {
  expireModeAtom,
  basemapAtom,
  showCartoAtom,
  useTileInvalidation,
  buildInvalidationBody,
  buildOverlayStyles,
  bboxFromScreenRect,
  bboxFeature,
  ensureExpireBboxLayer,
  removeExpireBboxLayer,
  EXPIRE_BBOX_SOURCE,
  selectedMapFromFeature,
  bandForScale,
  bandForZoom,
  type Bbox,
  type ExpireMode,
  type FootprintMode,
  type SelectedMap,
  type InvalidationResult,
} from "./lib";
import styles from "./main.module.scss";

const h = hyper.styled(styles);

const PANEL_WIDTH = 320;

export function Page() {
  const dark = useDarkMode();
  const basemap = useAtomValue(basemapAtom);
  const baseStyle = basemapStyle(basemap, dark?.isEnabled);
  const [isOpen, setOpen] = useState(true);

  const [mode, setMode] = useAtom(expireModeAtom);
  const [showCarto, setShowCarto] = useAtom(showCartoAtom);
  const [selectedMaps, setSelectedMaps] = useState<SelectedMap[]>([]);
  const [footprintMode, setFootprintMode] = useState<FootprintMode>("all");
  const [dz, setDz] = useState(1);
  // Viewport-mode targets the on-screen cache rectangle: its geographic bbox is
  // recomputed in the background as the map moves; zoom drives the scale band.
  const [expireBbox, setExpireBbox] = useState<Bbox | null>(null);
  const [zoom, setZoom] = useState<number | null>(null);

  const selectedIds = useMemo(
    () => selectedMaps.map((m) => m.source_id),
    [selectedMaps]
  );

  const overlayStyles = useMemo(
    () => buildOverlayStyles({ showCarto, footprintMode, dz, selectedIds }),
    [showCarto, footprintMode, dz, selectedIds]
  );

  // Toggle a clicked map in/out of the selection (clicking empty space is a no-op).
  const toggleMap = useCallback((map: SelectedMap | null) => {
    if (map == null) return;
    setSelectedMaps((prev) => {
      const exists = prev.some((m) => m.source_id === map.source_id);
      return exists
        ? prev.filter((m) => m.source_id !== map.source_id)
        : [...prev, map];
    });
  }, []);

  // Switching to viewport mode clears the map selection.
  const changeMode = useCallback(
    (next: ExpireMode) => {
      if (next === "viewport") setSelectedMaps([]);
      setMode(next);
    },
    [setMode]
  );

  const { invalidate, running, result, error, reportError } =
    useTileInvalidation();

  const handleExpire = useCallback(() => {
    const { body, error } = buildInvalidationBody({
      mode,
      selectedMaps,
      expireBbox,
      zoom,
    });
    if (body == null) {
      reportError(error ?? "Invalid selection");
      return;
    }
    invalidate(body);
  }, [mode, selectedMaps, expireBbox, zoom, invalidate, reportError]);

  const onMapMoved = useCallback((_pos, map: mapboxgl.Map) => {
    setZoom(map.getZoom());
  }, []);

  // Inset the cache rectangle to clear the floating panel on the left.
  const rectInset = { left: isOpen ? PANEL_WIDTH + 24 : 24 };

  const contextPanel = h(
    PanelCard,
    { style: { width: PANEL_WIDTH } },
    h(CachePanel, {
      mode,
      onModeChange: changeMode,
      selectedMaps,
      onClearSelection: () => setSelectedMaps([]),
      zoom,
      footprintMode,
      onFootprintModeChange: setFootprintMode,
      dz,
      onDzChange: setDz,
      showCarto,
      onShowCartoChange: setShowCarto,
      onExpire: handleExpire,
      running,
      result,
      error,
    })
  );

  const mapChildren = [
    h(MapSelectionHandler, {
      enabled: mode === "map",
      onSelect: toggleMap,
    }),
  ];
  if (mode === "viewport") {
    mapChildren.push(
      h(CacheRectangle, { inset: rectInset, onBboxChange: setExpireBbox })
    );
  }

  return h(
    MapAreaContainer,
    {
      navbar: h(
        FloatingNavbar,
        { className: styles["cache-navbar"], width: PANEL_WIDTH },
        h(NavbarHeader, { isOpen, onToggle: () => setOpen(!isOpen) })
      ),
      contextPanel,
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
        onMapMoved,
      },
      mapChildren
    )
  );
}

/** A fixed on-screen rectangle marking the viewport-expiry region. It does not
 * move with the map; instead its geographic bbox is recomputed (by unprojecting
 * its corners) whenever the map settles, reported via onBboxChange, and drawn as
 * a faint polygon on the map showing what will actually be invalidated.
 *
 * The faint polygon is drawn imperatively (setData) rather than via overlay
 * styles, because changing overlay styles re-runs map.setStyle() — too costly
 * per move. It's re-added on `style.load` so it survives overlay-driven restyles. */
function CacheRectangle({
  inset,
  onBboxChange,
}: {
  inset: { left: number };
  onBboxChange: (bbox: Bbox) => void;
}) {
  const mapRef = useMapRef();
  const rectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const map = mapRef.current;
    const el = rectRef.current;
    if (map == null || el == null) return;

    const report = () => {
      const canvas = map.getCanvas().getBoundingClientRect();
      const rect = el.getBoundingClientRect();
      const bbox = bboxFromScreenRect(map, rect, canvas);
      onBboxChange(bbox);
      if (!map.isStyleLoaded()) return;
      ensureExpireBboxLayer(map);
      const source = map.getSource(EXPIRE_BBOX_SOURCE) as mapboxgl.GeoJSONSource;
      source?.setData(bboxFeature(bbox));
    };

    report();
    map.on("moveend", report);
    map.on("resize", report);
    map.on("style.load", report);
    return () => {
      map.off("moveend", report);
      map.off("resize", report);
      map.off("style.load", report);
      if (map.isStyleLoaded()) removeExpireBboxLayer(map);
    };
  }, [mapRef, onBboxChange, inset.left]);

  return h("div.cache-rect", { ref: rectRef, style: { left: inset.left } });
}

/** Selects a constituent map by clicking its footprint (map mode only). Lives
 * inside MapView so it has the map context; clicking empty space clears. */
function MapSelectionHandler({
  enabled,
  onSelect,
}: {
  enabled: boolean;
  onSelect: (map: SelectedMap | null) => void;
}) {
  useMapClickHandler(
    (e) => {
      if (!enabled) return;
      const map = e.target;
      const features = map.queryRenderedFeatures(e.point, {
        layers: ["footprints-hit"],
      });
      onSelect(selectedMapFromFeature(features[0]));
    },
    [enabled, onSelect]
  );
  return null;
}

// ─── Navbar header ────────────────────────────────────────────────────────────

function NavbarHeader({
  isOpen,
  onToggle,
}: {
  isOpen: boolean;
  onToggle: () => void;
}) {
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

// ─── Side panel ──────────────────────────────────────────────────────────────

interface CachePanelProps {
  mode: ExpireMode;
  onModeChange: (m: ExpireMode) => void;
  selectedMaps: SelectedMap[];
  onClearSelection: () => void;
  zoom: number | null;
  footprintMode: FootprintMode;
  onFootprintModeChange: (m: FootprintMode) => void;
  dz: number;
  onDzChange: (dz: number) => void;
  showCarto: boolean;
  onShowCartoChange: (v: boolean) => void;
  onExpire: () => void;
  running: boolean;
  result: InvalidationResult | null;
  error: string | null;
}

function CachePanel(props: CachePanelProps) {
  const { mode, onModeChange, selectedMaps, zoom, onExpire, running } = props;

  let target = null;
  if (mode === "map") {
    target = h(SelectedMapsList, {
      selectedMaps,
      onClear: props.onClearSelection,
    });
  } else {
    target = h(ViewportTargetInfo, { zoom });
  }

  let resultCallout = null;
  if (props.result != null) {
    resultCallout = h(InvalidationResultCallout, { result: props.result });
  }

  let errorCallout = null;
  if (props.error != null) {
    errorCallout = h(
      Callout,
      { className: "result-callout", intent: Intent.DANGER, title: "Error" },
      h("p", props.error)
    );
  }

  const canExpire =
    mode === "map" ? selectedMaps.length > 0 : zoom != null;

  return h("div.cache-panel", [
    h(
      FormGroup,
      { label: "Target", className: "field" },
      h(SegmentedControl, {
        fill: true,
        small: true,
        options: [
          { label: "Viewport", value: "viewport" },
          { label: "Map", value: "map" },
        ],
        value: mode,
        onValueChange: (v) => onModeChange(v as ExpireMode),
      })
    ),
    target,
    h(
      Button,
      {
        intent: Intent.DANGER,
        fill: true,
        loading: running,
        disabled: running || !canExpire,
        onClick: onExpire,
      },
      "Expire tiles"
    ),
    resultCallout,
    errorCallout,
    h(FootprintControls, {
      footprintMode: props.footprintMode,
      onFootprintModeChange: props.onFootprintModeChange,
      dz: props.dz,
      onDzChange: props.onDzChange,
    }),
    h(Switch, {
      className: "carto-toggle",
      label: "Macrostrat map",
      checked: props.showCarto,
      onChange: (e) => props.onShowCartoChange(e.currentTarget.checked),
    }),
    h(BaseLayerForm),
  ]);
}

/** Band summary like "small layer · zoom 3–5". */
function bandLabel(scale: string, minZoom: number, maxZoom: number): string {
  return `${scale} layer · zoom ${minZoom}–${maxZoom}`;
}

/** Selected maps, each with its scale band, plus a clear button at top right. */
function SelectedMapsList({
  selectedMaps,
  onClear,
}: {
  selectedMaps: SelectedMap[];
  onClear: () => void;
}) {
  if (selectedMaps.length === 0) {
    return h(
      Callout,
      { className: "target-info", intent: Intent.PRIMARY, icon: "select" },
      "Click map footprints to select them. Click again to deselect."
    );
  }

  const items = selectedMaps.map((m) => {
    const band = bandForScale(m.scale);
    return h("li.map-item", { key: m.source_id }, [
      h("span.map-name", m.name || m.slug),
      h(Tag, { minimal: true, className: "map-band" }, band.scale),
    ]);
  });

  return h("div.target-info", [
    h("div.list-header", [
      h("span", `${selectedMaps.length} map(s) selected`),
      h(Button, {
        minimal: true,
        small: true,
        icon: "cross",
        onClick: onClear,
        title: "Clear selection",
      }),
    ]),
    h("ul.map-list", items),
  ]);
}

function ViewportTargetInfo({ zoom }: { zoom: number | null }) {
  if (zoom == null) return h("p.target-info", "Waiting for the map…");

  const band = bandForZoom(zoom);
  return h("div.target-info", [
    h("p", "Expires the highlighted region for the carto layer at this zoom:"),
    h(Tag, { minimal: true }, bandLabel(band.scale, band.minZoom, band.maxZoom)),
  ]);
}

/** Controls for the footprints overlay: full maps vs. realized faces, and how
 * many zoom levels early to show footprints (dz). */
function FootprintControls({
  footprintMode,
  onFootprintModeChange,
  dz,
  onDzChange,
}: {
  footprintMode: FootprintMode;
  onFootprintModeChange: (m: FootprintMode) => void;
  dz: number;
  onDzChange: (dz: number) => void;
}) {
  return h("div.footprint-controls", [
    h(
      FormGroup,
      { label: "Footprints", className: "field" },
      h(SegmentedControl, {
        fill: true,
        small: true,
        options: [
          { label: "All maps", value: "all" },
          { label: "Active faces", value: "active" },
        ],
        value: footprintMode,
        onValueChange: (v) => onFootprintModeChange(v as FootprintMode),
      })
    ),
    h(
      FormGroup,
      { label: "Show earlier by (zoom levels)", className: "field" },
      h(NumericInput, {
        value: dz,
        min: 0,
        max: 4,
        fill: true,
        onValueChange: (v) => onDzChange(Number.isNaN(v) ? 0 : v),
      })
    ),
  ]);
}

function InvalidationResultCallout({ result }: { result: InvalidationResult }) {
  const l1 = result.flushed_l1 ? "carto cache flushed" : "flush not applied";
  return h(
    Callout,
    { className: "result-callout", intent: Intent.SUCCESS, title: "Tiles expired" },
    [
      h("p", `L2 database: ${result.deleted_l2} tile(s) deleted`),
      h("p", `L1 Varnish: ${l1}`),
    ]
  );
}
