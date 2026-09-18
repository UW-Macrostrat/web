/**
 * The *instance* half of the shared column-navigation map (see `./target`).
 *
 * Mounted once by `pages/columns/+Layout.ts` (client-only — this module reaches
 * mapbox-gl). It renders the map tree through a portal into the single map node
 * that `./target` owns, so the React tree — and therefore the `mapboxgl.Map`
 * instance — is bound to the layout's lifetime rather than to any one page.
 * Pages move that node into their `ColumnMapSlot`; the map only re-targets.
 *
 * The footprint fetch lives here rather than in the pages, so the column set is
 * fetched once per project scope and stays warm across navigation — the pages
 * publish only which ids to draw.
 */
import h from "@macrostrat/hyper";
import { ColumnNavigationMap } from "@macrostrat/map-views";
import {
  CORE_COLUMNS_PROJECT_ID,
  MacrostratDataProvider,
  useMacrostratColumns,
} from "@macrostrat/data-provider";
import {
  useMapInitialized,
  useMapRef,
  useMapStyleOperator,
  useOverlayStyle,
} from "@macrostrat/mapbox-react";
import { buildGeoJSONSource, setGeoJSON } from "@macrostrat/mapbox-utils";
import { apiV2Prefix, mapboxAccessToken } from "@macrostrat-web/settings";
import { ErrorBoundary } from "@macrostrat/ui-components";
import { useAtomValue, useSetAtom } from "jotai";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import {
  columnMapBoundsAtom,
  columnMapStore,
  columnMapTargetAtom,
  getColumnMapNode,
  type ColumnMapTarget,
  type MapBounds,
} from "./target";

export function ColumnPersistentMap() {
  const target = useAtomValue(columnMapTargetAtom, { store: columnMapStore });
  // The node is created in the browser only; resolving it in an effect also
  // guarantees the first render is portal-free (nothing to hydrate).
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    setNode(getColumnMapNode());
  }, []);

  // Nothing is built until a page actually asks for a map; that first slot is
  // also what gives Mapbox a correctly sized container to initialize into.
  if (node == null || target == null) return null;

  return createPortal(
    h(
      ErrorBoundary,
      h(
        MacrostratDataProvider,
        { baseURL: apiV2Prefix },
        h(ColumnNavigationMapView, { target })
      )
    ),
    node
  );
}

function ColumnNavigationMapView({ target }: { target: ColumnMapTarget }) {
  const { projectID, inProcess, visibleColumnIDs, selectedColumn } = target;

  const footprints =
    useMacrostratColumns(projectID ?? CORE_COLUMNS_PROJECT_ID, inProcess) ?? [];

  // `null` means "everything in scope" — the column page, and the list when no
  // list is mounted to agree with.
  const visibleKey = visibleColumnIDs?.join(",") ?? null;
  const columns = useMemo(() => {
    if (visibleColumnIDs == null) return footprints;
    const visible = new Set(visibleColumnIDs);
    return footprints.filter((col) => visible.has(col.properties?.col_id));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on contents
  }, [footprints, visibleKey]);

  return h(
    ColumnNavigationMap,
    {
      style: { height: "100%" },
      accessToken: mapboxAccessToken,
      columns,
      projectID,
      selectedColumn,
      onSelectColumn: target.onSelectColumn,
    },
    [
      h(SelectedColumnsOverlay, {
        key: "selection",
        columns,
        selectedIDs: target.selectedColumnIDs,
      }),
      h(ColumnMapBoundsReporter, { key: "bounds" }),
    ]
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

/** Every selected column's footprint, not just one. Exported because the
 * list page's map-dominant shell builds its own `MapView` and needs the same
 * overlay. */
export function SelectedColumnsOverlay({ columns, selectedIDs }) {
  useOverlayStyle(() => selectedColumnsStyle, []);

  const selectedKey = selectedIDs.join(",");
  const features = useMemo(() => {
    if (selectedIDs.length === 0) return [];
    const selected = new Set(selectedIDs);
    return columns.filter((col) => selected.has(col.properties?.col_id));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on contents
  }, [columns, selectedKey]);

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

/** Publishes the map viewport to `columnMapBoundsAtom`, in the shared store the
 * pages read. Attaches as soon as the map object exists and reports on `load`
 * as well as `moveend`/`zoomend`, so the first bounds land even if the map
 * finished setting up before this ran. */
export function ColumnMapBoundsReporter() {
  const mapRef = useMapRef();
  const initialized = useMapInitialized();
  const setBounds = useSetAtom(columnMapBoundsAtom, { store: columnMapStore });

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
