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
import { ReactNode, useCallback, useEffect, useRef } from "react";
import {
  MapAreaContainer,
  MapLoadingButton,
  MapView,
  PanelCard,
} from "@macrostrat/map-interface";
import { atom, useAtomValue, useSetAtom } from "jotai";
import {
  basemapStyle,
  PageBreadcrumbsInternal,
  PageTitle,
  usePageBreadcrumbs,
} from "~/components";
import {
  basemapAtom,
  bboxFeature,
  bboxFromScreenRect,
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
  viewportBboxAtom,
  zoomAtom,
  zoomOffsetAtom,
} from "./lib";
import styles from "./main.module.scss";
import { CachePanel } from "./cache-panel.ts";
import { Divider } from "@blueprintjs/core";
import { StyleFragment } from "@macrostrat/map-styles";

const h = hyper.styled(styles);

const PANEL_WIDTH = 320;

export function Page() {
  const dark = useDarkMode();
  const basemap = useAtomValue(basemapAtom);
  const baseStyle = basemapStyle(basemap, dark?.isEnabled);

  const overlayStyles = useAtomValue(overlayStylesAtom);
  const onMapMoved = useSetAtom(mapMovedHandlerAtom);
  const mapChildren = useAtomValue(mapChildrenAtom);

  return h(
    MapAreaContainer,
    {
      contextPanel: h(PanelCard, { style: { width: PANEL_WIDTH } }, [
        h(NavbarHeader),
        h(Divider),
        h(CachePanel),
      ]),
      contextPanelOpen: true,
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

const mapMovedHandlerAtom = atom(
  null,
  (get, set, _pos: any, map: mapboxgl.Map) => {
    set(zoomAtom, map.getZoom());
  }
);

const mapChildrenAtom = atom<ReactNode>((get) => {
  const mode = get(expireModeAtom);
  if (mode === "viewport") {
    return h(CacheRectangle);
  }
  if (mode === "map") {
    return h(MapSelectionHandler);
  }
  return null;
});

const overlayStylesAtom = atom<StyleFragment[]>((get) => {
  const showCarto = get(showCartoAtom);
  const footprintMode = get(footprintModeAtom);
  const dz = get(zoomOffsetAtom);
  const selectedMaps = get(selectedMapsAtom);
  const selectedIds = selectedMaps.map((m) => m.source_id);
  return buildOverlayStyles({ showCarto, footprintMode, dz, selectedIds });
});

/** A fixed on-screen rectangle marking the viewport-expiry region. It does not
 * move with the map; instead its geographic bbox is recomputed (by unprojecting
 * its corners) whenever the map settles, reported via onBboxChange, and drawn as
 * a faint polygon on the map showing what will actually be invalidated.
 *
 * The faint polygon is drawn imperatively (setData) rather than via overlay
 * styles, because changing overlay styles re-runs map.setStyle() — too costly
 * per move. It's re-added on `style.load` so it survives overlay-driven restyles. */
function CacheRectangle() {
  const mapRef = useMapRef();
  const rectRef = useRef<HTMLDivElement>(null);

  // Viewport-mode targets the on-screen cache rectangle: its geographic bbox is
  // recomputed in the background as the map moves; zoom drives the scale band.
  const onBboxChange = useSetAtom(viewportBboxAtom);

  // Inset the cache rectangle to clear the floating panel on the left.
  // TODO: could do this with map padding
  const inset = { left: PANEL_WIDTH + 24 };

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
function MapSelectionHandler() {
  const setSelectedMaps = useSetAtom(selectedMapsAtom);

  // Toggle a clicked map in/out of the selection (clicking empty space is a no-op).
  const onSelect = useCallback((map: SelectedMap | null) => {
    if (map == null) return;
    setSelectedMaps((prev) => {
      const exists = prev.some((m) => m.source_id === map.source_id);
      return exists
        ? prev.filter((m) => m.source_id !== map.source_id)
        : [...prev, map];
    });
  }, []);

  useMapClickHandler(
    (e) => {
      const map = e.target;
      const features = map.queryRenderedFeatures(e.point, {
        layers: ["footprints-hit"],
      });
      onSelect(selectedMapFromFeature(features[0]));
    },
    [onSelect]
  );
  return null;
}

// ─── Navbar header (trying to be a shared component) ────────────────────────────────────────────────────────────
function NavbarHeader({
  isOpen,
  onToggle,
}: {
  isOpen?: boolean;
  onToggle?: () => void;
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
      h.if(onToggle != null)([
        h(Spacer),
        h(MapLoadingButton, {
          active: isOpen ?? false,
          onClick: onToggle,
          large: false,
        }),
      ]),
    ]),
  ]);
}

// ─── Side panel ──────────────────────────────────────────────────────────────
