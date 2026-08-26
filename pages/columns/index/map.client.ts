/** The column list page's map: the same footprints the list shows, wired for
 * selection rather than navigation, plus a reporter that publishes the current
 * viewport so the list can filter to "in map area". */

import h from "@macrostrat/hyper";
import { ColumnNavigationMap } from "@macrostrat/column-views";
import {
  MacrostratDataProvider,
  useMacrostratColumns,
} from "@macrostrat/data-provider";
import { useMapInitialized, useMapRef } from "@macrostrat/mapbox-react";
import { apiV2Prefix, mapboxAccessToken } from "@macrostrat-web/settings";
import { ErrorBoundary } from "@macrostrat/ui-components";
import { useAtomValue, useSetAtom } from "jotai";
import { useEffect, useMemo } from "react";

import {
  mapBoundsAtom,
  selectFromMapAtom,
  selectedColumnsAtom,
  showInProcessAtom,
  visibleRowsAtom,
  type MapBounds,
} from "./state";

export function ColumnListMap({ projectID }) {
  return h(
    ErrorBoundary,
    h(
      MacrostratDataProvider,
      { baseURL: apiV2Prefix },
      h(ColumnListMapInner, { projectID })
    )
  );
}

function ColumnListMapInner({ projectID }) {
  const inProcess = useAtomValue(showInProcessAtom);
  const footprints = useMacrostratColumns(projectID, inProcess) ?? [];
  const rows = useAtomValue(visibleRowsAtom);
  const [selected, setSelected] = useColumnSelection();

  // Show only the columns the list's filters admit — the map is a second view
  // of the same result set, not an independent one.
  const columns = useMemo(() => {
    const visible = new Set(rows.map((row) => row.col_id));
    return footprints.filter((col) => visible.has(col.properties.col_id));
  }, [footprints, rows]);

  return h(
    ColumnNavigationMap,
    {
      style: { height: "100%" },
      accessToken: mapboxAccessToken,
      columns,
      projectID,
      selectedColumn: selected,
      onSelectColumn: setSelected,
    },
    h(MapBoundsReporter)
  );
}

/** The map carries a single selected column; the page's selection is a set, so
 * the map shows (and replaces) its leading member.
 *
 * The write goes through `selectFromMapAtom` because `ColumnNavigationProvider`
 * echoes: syncing its `selectedColumn` prop calls `selectColumn`, which fires
 * `onSelectColumn` straight back. Without the no-op-on-echo guard, every
 * re-sync collapses a multi-row selection down to its leading member. */
function useColumnSelection(): [number | null, (id: number | null) => void] {
  const selected = useAtomValue(selectedColumnsAtom);
  const select = useSetAtom(selectFromMapAtom);

  const leading = selected.length > 0 ? selected[0] : null;
  return [leading, select];
}

/** Publishes the map viewport to `mapBoundsAtom` on every settled move. */
function MapBoundsReporter() {
  const mapRef = useMapRef();
  const initialized = useMapInitialized();
  const setBounds = useSetAtom(mapBoundsAtom);

  useEffect(() => {
    const map = mapRef?.current;
    if (!initialized || map == null) return;

    const report = (event?: any) => {
      // Only user-driven moves. A programmatic move (fitting to a selection, or
      // re-framing when the drawn column set changes) carries no
      // `originalEvent` — reporting those would let the "in map area" filter
      // feed its own result back into the map and oscillate.
      if (event != null && event.originalEvent == null) return;
      const bounds = map.getBounds();
      if (bounds == null) return;
      setBounds(bounds.toArray() as MapBounds);
    };

    report();
    map.on("moveend", report);
    return () => {
      map.off("moveend", report);
    };
  }, [initialized, mapRef, setBounds]);

  return null;
}
