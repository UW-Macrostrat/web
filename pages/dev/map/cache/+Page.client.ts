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
  MapAreaContainer,
  MapLoadingButton,
  MapView,
  PanelCard,
} from "@macrostrat/map-interface";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  basemapStyle,
  PageBreadcrumbsInternal,
  PageTitle,
  usePageBreadcrumbs,
} from "~/components";
import {
  basemapAtom,
  type Bbox,
  bboxFeature,
  bboxFromScreenRect,
  buildInvalidationBody,
  buildOverlayStyles,
  ensureExpireBboxLayer,
  EXPIRE_BBOX_SOURCE,
  expireModeAtom,
  footprintModeAtom,
  removeExpireBboxLayer,
  type SelectedMap,
  selectedMapFromFeature,
  selectedMapsAtom,
  showCartoAtom,
  useTileInvalidation,
  viewportBboxAtom,
  zoomAtom,
  zoomOffsetAtom,
} from "./lib";
import styles from "./main.module.scss";
import { CachePanel } from "./cache-panel.ts";

const h = hyper.styled(styles);

const PANEL_WIDTH = 320;

export function Page() {
  const dark = useDarkMode();
  const basemap = useAtomValue(basemapAtom);
  const baseStyle = basemapStyle(basemap, dark?.isEnabled);
  const [isOpen, setOpen] = useState(true);

  const mode = useAtomValue(expireModeAtom);
  const showCarto = useAtomValue(showCartoAtom);
  const [selectedMaps, setSelectedMaps] = useAtom(selectedMapsAtom);
  const footprintMode = useAtomValue(footprintModeAtom);
  const dz = useAtomValue(zoomOffsetAtom);
  // Viewport-mode targets the on-screen cache rectangle: its geographic bbox is
  // recomputed in the background as the map moves; zoom drives the scale band.
  const setExpireBbox = useSetAtom(viewportBboxAtom);
  const setZoom = useSetAtom(zoomAtom);

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

  const onMapMoved = useCallback((_pos, map: mapboxgl.Map) => {
    setZoom(map.getZoom());
  }, []);

  // Inset the cache rectangle to clear the floating panel on the left.
  const rectInset = { left: isOpen ? PANEL_WIDTH + 24 : 24 };

  const contextPanel = h(
    PanelCard,
    { style: { width: PANEL_WIDTH } },
    h(CachePanel)
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
      const source = map.getSource(
        EXPIRE_BBOX_SOURCE
      ) as mapboxgl.GeoJSONSource;
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
