/** Map footprints (`maps.sources.rgeom`) from the tileserver's bounds route,
 * drawn for whatever the list is showing. A click lists the maps covering
 * that point in the assistant — the `/dev/map/sources` inspector, on the frame. */

import { burwellTileDomain, mapboxAccessToken } from "@macrostrat-web/settings";
import {
  FeatureSelectionHandler,
  MapMarker,
  MapView,
} from "@macrostrat/map-interface";
import { MapboxMapProvider } from "@macrostrat/mapbox-react";
import { removeMapLabels } from "@macrostrat/mapbox-utils";
import { ErrorBoundary, useInDarkMode } from "@macrostrat/ui-components";
import h from "@macrostrat/hyper";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback, useMemo } from "react";

import { MapResizer } from "~/components/map-resizer";
import { useInsetMapStyleProps } from "~/components/map-settings";
import { hasContentPane, layoutModeAtom, layoutShellAtom } from "~/layouts/hybrid";

import {
  allMapsAtom,
  inspectedMapIDsAtom,
  inspectedPointAtom,
  visibleMapsAtom,
  type Point,
} from "./state";

const SOURCE = "map-bounds";

export function MapListMap() {
  return h(ErrorBoundary, h(MapListMapShell));
}

/** The map shell is `MapAreaContainer`, which supplies a map provider; the
 * content and split shells place the map in a plain cell, so it brings one. */
function MapListMapShell() {
  const shell = useAtomValue(layoutShellAtom);
  if (shell === "map") {
    return h(MapListMapInner, { standalone: false });
  }
  return h(MapboxMapProvider, h(MapListMapInner, { standalone: true }));
}

function MapListMapInner({ standalone }) {
  const { mapStyle, showLabels } = useInsetMapStyleProps();
  const [point, setPoint] = useAtom(inspectedPointAtom);
  const overlayStyles = useOverlayStyles();
  const setFeatures = useFeatureIDs();

  const transformStyle = useCallback(
    (style) => {
      if (showLabels) return style;
      return removeMapLabels(style, true);
    },
    [showLabels]
  );

  const setPosition = useCallback(
    (position: Point | null) => {
      if (position == null) {
        setPoint(null);
        return;
      }
      setPoint({ lng: position.lng, lat: position.lat });
    },
    [setPoint]
  );

  return h(
    MapView,
    {
      style: mapStyle,
      mapboxToken: mapboxAccessToken,
      accessToken: mapboxAccessToken,
      projection: { name: "globe" },
      overlayStyles,
      transformStyle,
      standalone,
      height: "100%",
    },
    [
      h(MapMarker, { key: "marker", position: point, setPosition }),
      h(FeatureSelectionHandler, {
        key: "features",
        selectedLocation: point,
        setFeatures,
      }),
      h(MapResizer, { key: "resizer" }),
    ]
  );
}

/** Rendered features at the point, reduced to unique source ids. */
function useFeatureIDs() {
  const setIDs = useSetAtom(inspectedMapIDsAtom);
  return useCallback(
    (features) => {
      const ids = new Set<number>();
      for (const feature of features ?? []) {
        if (feature.source !== SOURCE) continue;
        ids.add(feature.properties?.source_id);
      }
      setIDs([...ids].sort((a, b) => a - b));
    },
    [setIDs]
  );
}

/** The list lives in the context panel, which the map-only mode unmounts, so
 * its filtered set goes stale there; fall back to every map. */
function useVisibleMapIDs(): number[] | null {
  const mode = useAtomValue(layoutModeAtom);
  const visible = useAtomValue(visibleMapsAtom);
  const all = useAtomValue(allMapsAtom);
  return useMemo(() => {
    if (!hasContentPane(mode) || visible == null) return null;
    if (visible.length === all.length) return null;
    return visible.map((row) => row.source_id);
  }, [mode, visible, all]);
}

function useOverlayStyles() {
  const inDarkMode = useInDarkMode();
  const visibleIDs = useVisibleMapIDs();
  const inspectedIDs = useAtomValue(inspectedMapIDsAtom);
  return useMemo(
    () => [boundsStyle(inDarkMode, visibleIDs, inspectedIDs)],
    [inDarkMode, visibleIDs, inspectedIDs]
  );
}

function withFilter(layer: any, ids: number[] | null) {
  if (ids == null) return layer;
  return { ...layer, filter: ["in", ["get", "source_id"], ["literal", ids]] };
}

function boundsStyle(
  inDarkMode: boolean,
  visibleIDs: number[] | null,
  inspectedIDs: number[]
) {
  let tone = 20;
  if (inDarkMode) tone = 255;
  const color = `rgb(${tone}, ${tone}, ${tone})`;

  return {
    version: 8,
    sources: {
      [SOURCE]: {
        type: "vector",
        tiles: [`${burwellTileDomain}/maps/bounds/{z}/{x}/{y}`],
        maxzoom: 9,
      },
    },
    layers: [
      withFilter(
        {
          id: "map-bounds-fill",
          type: "fill",
          source: SOURCE,
          "source-layer": "bounds",
          paint: { "fill-color": color, "fill-opacity": 0.08 },
        },
        visibleIDs
      ),
      withFilter(
        {
          id: "map-bounds-line",
          type: "line",
          source: SOURCE,
          "source-layer": "bounds",
          paint: { "line-color": color, "line-width": 1, "line-opacity": 0.5 },
        },
        visibleIDs
      ),
      {
        id: "map-bounds-inspected",
        type: "line",
        source: SOURCE,
        "source-layer": "bounds",
        filter: ["in", ["get", "source_id"], ["literal", inspectedIDs]],
        paint: { "line-color": "#f5a623", "line-width": 2 },
      },
    ],
  };
}
