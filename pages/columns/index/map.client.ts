/** The column list page's map, in two compositions.
 *
 * The two shells need genuinely different maps:
 *
 *  - **Content shell** — an aspect-locked inset in the sidebar. `InsetMap`
 *    (via `ColumnNavigationMap`) is exactly that: self-contained, with its own
 *    `MapboxMapProvider`.
 *  - **Map shell** — the map *is* the page. Here it must be a `MapView` bound to
 *    `MapAreaContainer`'s own provider, which is how the main map page composes
 *    it. Dropping an `InsetMap` in as the main panel nests a second provider
 *    inside the container's, so the container's zoom/controls and its
 *    position-derived classes bind to a provider with no map in it — one of the
 *    reasons the map-dominant modes didn't work.
 *
 * `ColumnsNavigationLayer` is exported separately from `ColumnNavigationMap`,
 * so the column rendering and its interactions are shared rather than
 * reimplemented.
 */

import h from "@macrostrat/hyper";
import {
  ColumnNavigationMap,
  ColumnsNavigationLayer,
} from "@macrostrat/column-views";
import {
  MacrostratDataProvider,
  useMacrostratColumns,
} from "@macrostrat/data-provider";
import { getBasicMapStyle, MapView } from "@macrostrat/map-interface";
import {
  useMapInitialized,
  useMapRef,
  useMapStyleOperator,
  useOverlayStyle,
} from "@macrostrat/mapbox-react";
import { buildGeoJSONSource, setGeoJSON } from "@macrostrat/mapbox-utils";
import { apiV2Prefix, mapboxAccessToken } from "@macrostrat-web/settings";
import { ErrorBoundary, useInDarkMode } from "@macrostrat/ui-components";
import { useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useMemo } from "react";
import { navigate } from "vike/client/router";

import { hasContentPane, layoutModeAtom, layoutShellAtom } from "~/layouts/hybrid";

import {
  allRowsAtom,
  linkPrefixAtom,
  mapBoundsAtom,
  selectedColumnsAtom,
  selectionModeAtom,
  showInProcessAtom,
  toggleColumnAtom,
  visibleRowsAtom,
  type MapBounds,
} from "./state";

export function ColumnListMap({ projectID }) {
  return h(
    ErrorBoundary,
    h(
      MacrostratDataProvider,
      { baseURL: apiV2Prefix },
      h(ColumnMapSwitch, { projectID })
    )
  );
}

function ColumnMapSwitch({ projectID }) {
  const shell = useAtomValue(layoutShellAtom);
  if (shell === "map") {
    // `MapAreaContainer`'s desktop layout makes the map full-bleed via
    // `.map-view-container:not(.standalone) { position: unset }`, so this one
    // must *not* be standalone.
    return h(FullMap, { projectID, standalone: false });
  }
  if (shell === "split") {
    // Fills its grid cell, which has a definite size — so it sets its own
    // viewport rather than being positioned by a container overlay.
    return h(FullMap, { projectID, standalone: true });
  }
  return h(InsetColumnMap, { projectID });
}

/** Footprints for the columns the map should draw.
 *
 * Normally the list's post-filter set, so the two views agree. But the list
 * lives in the context panel, which `MapAreaContainer` unmounts when it closes —
 * taking `VisibleRowsBridge` with it, so `visibleRowsAtom` goes stale and empty.
 * In `map-only` there is no list to agree with, so the map falls back to the
 * server-side result. (This is why map-only previously drew nothing at all.)
 */
function useMapColumns(projectID: number) {
  const inProcess = useAtomValue(showInProcessAtom);
  const footprints = useMacrostratColumns(projectID, inProcess) ?? [];
  const mode = useAtomValue(layoutModeAtom);
  const visibleRows = useAtomValue(visibleRowsAtom);
  const allRows = useAtomValue(allRowsAtom);

  // Normally the list's post-filter set, so the two views agree. In `map-only`
  // there is no list mounted — `MapAreaContainer` unmounts the context panel,
  // and `VisibleRowsBridge` with it — so fall back to the server-side result
  // rather than drawing nothing.
  const rows = hasContentPane(mode) ? visibleRows : allRows;

  return useMemo(() => {
    const visible = new Set(rows.map((row) => row.col_id));
    return footprints.filter((col) => visible.has(col.properties.col_id));
  }, [footprints, rows]);
}

/* --------------------------------------------------------- content shell */

function InsetColumnMap({ projectID }) {
  const columns = useMapColumns(projectID);
  const onColumnClick = useColumnClickHandler();

  return h(
    ColumnNavigationMap,
    {
      style: { height: "100%" },
      accessToken: mapboxAccessToken,
      columns,
      projectID,
      // Left null on purpose: we draw the whole selection ourselves, and
      // driving this prop makes `ColumnNavigationProvider` echo
      // `onSelectColumn` back on every sync — which, now that a click can
      // navigate, would be a spurious navigation.
      selectedColumn: null,
      onSelectColumn: onColumnClick,
    },
    [
      h(SelectedColumnsOverlay, { key: "selection", columns }),
      h(MapBoundsReporter, { key: "bounds" }),
    ]
  );
}

/* ------------------------------------------------------------- map shell */

/** A plain `MapView` with the column layer and our overlays as children — used
 * both inside `MapAreaContainer` (map-only) and as a grid pane (map-primary).
 * `InsetMap` is deliberately not used here: it hardcodes `standalone: true`,
 * which is wrong for the container, and brings a second map provider. */
function FullMap({ projectID, standalone }) {
  const columns = useMapColumns(projectID);
  const onColumnClick = useColumnClickHandler();
  const inDarkMode = useInDarkMode();

  const mapStyle = useMemo(
    () => getBasicMapStyle({ inDarkMode }),
    [inDarkMode]
  );

  return h(
    MapView,
    {
      style: mapStyle,
      accessToken: mapboxAccessToken,
      standalone,
      height: "100%",
    },
    [
      h(ColumnsNavigationLayer, {
        key: "columns",
        columns,
        projectID,
        selectedColumn: null,
        onSelectColumn: onColumnClick,
      }),
      h(SelectedColumnsOverlay, { key: "selection", columns }),
      h(MapBoundsReporter, { key: "bounds" }),
    ]
  );
}

/* ------------------------------------------------------- shared behavior */

/** What a footprint click means depends on the shared selection mode: navigate
 * to the column, or toggle it in the selection. */
function useColumnClickHandler() {
  const selectionMode = useAtomValue(selectionModeAtom);
  const linkPrefix = useAtomValue(linkPrefixAtom);
  const toggleColumn = useSetAtom(toggleColumnAtom);

  return useCallback(
    (colID: number | null) => {
      if (colID == null) return;
      if (selectionMode) {
        toggleColumn(colID);
        return;
      }
      navigate(`${linkPrefix}columns/${colID}`);
    },
    [selectionMode, linkPrefix, toggleColumn]
  );
}

const selectedColumnsStyle = {
  version: 8,
  sources: {
    "selected-columns": buildGeoJSONSource(),
  },
  layers: [
    {
      id: "selected-columns-fill",
      type: "fill",
      source: "selected-columns",
      paint: { "fill-color": "rgba(126, 102, 169, 0.35)" },
    },
    {
      id: "selected-columns-outline",
      type: "line",
      source: "selected-columns",
      paint: {
        "line-color": "rgba(73, 47, 122, 0.9)",
        "line-width": 1.5,
      },
    },
  ],
};

/** Every selected column's footprint, not just one. */
function SelectedColumnsOverlay({ columns }) {
  const selectedIDs = useAtomValue(selectedColumnsAtom);

  useOverlayStyle(() => selectedColumnsStyle, []);

  const features = useMemo(() => {
    if (selectedIDs.length === 0) return [];
    const selected = new Set(selectedIDs);
    return columns.filter((col) => selected.has(col.properties?.col_id));
  }, [columns, selectedIDs]);

  useMapStyleOperator(
    (map) => {
      setGeoJSON(map, "selected-columns", {
        type: "FeatureCollection",
        features,
      });
    },
    [features]
  );

  return null;
}

/** Publishes the map viewport to `mapBoundsAtom`. Attaches as soon as the map
 * object exists and reports on `load` as well as `moveend`/`zoomend`, so the
 * first bounds land even if the map finished setting up before this ran. */
function MapBoundsReporter() {
  const mapRef = useMapRef();
  const initialized = useMapInitialized();
  const setBounds = useSetAtom(mapBoundsAtom);

  // Belt and braces: publish once the style is ready too. The effect below only
  // re-runs when `initialized` flips, so if the ref wasn't populated on its
  // first pass and that flag had already settled, nothing would ever be
  // published — leaving the "only in map area" filter stuck on "waiting for the
  // map".
  useMapStyleOperator((map) => {
    const bounds = map.getBounds();
    if (bounds == null) return;
    setBounds(bounds.toArray() as MapBounds);
  }, []);

  useEffect(() => {
    const map = mapRef?.current;
    if (map == null) return;

    const report = () => {
      const bounds = map.getBounds();
      if (bounds == null) return;
      setBounds(bounds.toArray() as MapBounds);
    };

    report();
    map.on("load", report);
    map.on("moveend", report);
    map.on("zoomend", report);
    return () => {
      map.off("load", report);
      map.off("moveend", report);
      map.off("zoomend", report);
    };
  }, [initialized, mapRef, setBounds]);

  return null;
}
