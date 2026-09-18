/** The column list page's map, in two compositions.
 *
 * **Content and split shells** use the shared, persistent map instance owned by
 * `pages/columns/+Layout.ts` (see `~/components/column-map/target`): the page
 * renders a `ColumnMapSlot`, which publishes what to draw and moves the one map
 * node into itself. That is what makes navigating to a column — and back — keep
 * a warm GL context instead of rebuilding one.
 *
 * **The map shell** still builds its own `MapView`. There the map *is* the page,
 * bound to `MapAreaContainer`'s own provider, which is how the main map page
 * composes it. The persistent map is a `ColumnNavigationMap`, which brings its
 * own `MapboxMapProvider` — nesting that inside the container's leaves the
 * container's zoom/controls and its position-derived classes bound to a provider
 * with no map in it. So this one mode keeps a separate instance.
 *
 * `ColumnsNavigationLayer` is exported separately from `ColumnNavigationMap`, so
 * the column rendering and its interactions are shared rather than
 * reimplemented.
 */

import h from "@macrostrat/hyper";
import { ColumnsNavigationLayer } from "@macrostrat/map-views";
import {
  MacrostratDataProvider,
  CORE_COLUMNS_PROJECT_ID,
  useMacrostratColumns,
} from "@macrostrat/data-provider";
import { getBasicMapStyle, MapView } from "@macrostrat/map-interface";
import { apiV2Prefix, mapboxAccessToken } from "@macrostrat-web/settings";
import { ErrorBoundary, useInDarkMode } from "@macrostrat/ui-components";
import { useAtomValue, useSetAtom } from "jotai";
import { useCallback, useMemo } from "react";
import { navigate } from "vike/client/router";

import { hasContentPane, layoutModeAtom, layoutShellAtom } from "~/layouts/hybrid";
import { ColumnMapSlot } from "~/components/column-map/target";
import {
  ColumnMapBoundsReporter,
  SelectedColumnsOverlay,
} from "~/components/column-map/persistent-map.client";

import { useShowInProcess } from "~/components/in-process-filter";
import {
  allRowsAtom,
  selectedColumnsAtom,
  selectionModeAtom,
  toggleColumnAtom,
  useColumnHref,
  visibleRowsAtom,
} from "./state";

export function ColumnListMap({ projectID }) {
  const shell = useAtomValue(layoutShellAtom);
  if (shell === "map") {
    // `MapAreaContainer`'s desktop layout makes the map full-bleed via
    // `.map-view-container:not(.standalone) { position: unset }`, so this one
    // must *not* be standalone.
    return h(
      ErrorBoundary,
      h(
        MacrostratDataProvider,
        { baseURL: apiV2Prefix },
        h(FullMap, { projectID, standalone: false })
      )
    );
  }
  return h(SharedColumnMap, { projectID });
}

/** Which columns the map should draw, as ids.
 *
 * Normally the list's post-filter set, so the two views agree. But the list
 * lives in the context panel, which `MapAreaContainer` unmounts when it closes —
 * taking `VisibleRowsBridge` with it, so `visibleRowsAtom` goes stale and empty.
 * With no list to agree with, fall back to the server-side result. */
function useVisibleColumnIDs(): number[] {
  const mode = useAtomValue(layoutModeAtom);
  const visibleRows = useAtomValue(visibleRowsAtom);
  const allRows = useAtomValue(allRowsAtom);
  const rows = hasContentPane(mode) ? visibleRows : allRows;
  return useMemo(() => rows.map((row) => row.col_id), [rows]);
}

/* ------------------------------------------------------ the shared instance */

/** Claims the persistent map and tells it what this page wants drawn. */
function SharedColumnMap({ projectID }) {
  const inProcess = useShowInProcess();
  const visibleColumnIDs = useVisibleColumnIDs();
  const selectedColumnIDs = useAtomValue(selectedColumnsAtom);
  const onSelectColumn = useColumnClickHandler();

  return h(ColumnMapSlot, {
    targetKey: `columns:${projectID ?? "default"}`,
    projectID,
    inProcess,
    visibleColumnIDs,
    selectedColumnIDs,
    // Left null on purpose: we draw the whole selection ourselves, and driving
    // this prop makes `ColumnNavigationProvider` echo `onSelectColumn` back on
    // every sync — which, now that a click can navigate, would be a spurious
    // navigation.
    selectedColumn: null,
    onSelectColumn,
  });
}

/* ------------------------------------------------------------- map shell */

/** A plain `MapView` with the column layer and our overlays as children — the
 * map-dominant mode, inside `MapAreaContainer`. */
function FullMap({ projectID, standalone }) {
  const inProcess = useShowInProcess();
  const visibleColumnIDs = useVisibleColumnIDs();
  const selectedIDs = useAtomValue(selectedColumnsAtom);
  const onColumnClick = useColumnClickHandler();
  const inDarkMode = useInDarkMode();

  const footprints =
    useMacrostratColumns(projectID ?? CORE_COLUMNS_PROJECT_ID, inProcess) ?? [];

  const visibleKey = visibleColumnIDs.join(",");
  const columns = useMemo(() => {
    const visible = new Set(visibleColumnIDs);
    return footprints.filter((col) => visible.has(col.properties?.col_id));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on contents
  }, [footprints, visibleKey]);

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
      h(SelectedColumnsOverlay, {
        key: "selection",
        columns,
        selectedIDs,
      }),
      h(ColumnMapBoundsReporter, { key: "bounds" }),
    ]
  );
}

/* ------------------------------------------------------- shared behavior */

/** What a footprint click means depends on the shared selection mode: navigate
 * to the column, or toggle it in the selection. */
function useColumnClickHandler() {
  const selectionMode = useAtomValue(selectionModeAtom);
  const columnHref = useColumnHref();
  const toggleColumn = useSetAtom(toggleColumnAtom);

  return useCallback(
    (colID: number | null) => {
      if (colID == null) return;
      if (selectionMode) {
        toggleColumn(colID);
        return;
      }
      navigate(columnHref(colID));
    },
    [selectionMode, columnHref, toggleColumn]
  );
}
