/** Regions from the tileserver's `/regions/tiles`, narrowed to what the list
 * shows. A click describes the regions at that point in the assistant. */

import { burwellTileDomain, mapboxAccessToken } from "@macrostrat-web/settings";
import {
  FeatureSelectionHandler,
  MapMarker,
  MapView,
} from "@macrostrat/map-interface";
import {
  MapboxMapProvider,
  useMapRef,
  useMapStatus,
} from "@macrostrat/mapbox-react";
import { removeMapLabels } from "@macrostrat/mapbox-utils";
import { ErrorBoundary } from "@macrostrat/ui-components";
import h from "@macrostrat/hyper";
import { useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useMemo } from "react";

import { MapResizer } from "~/components/map-resizer";
import { useInsetMapStyleProps } from "~/components/map-settings";
import {
  hasContentPane,
  layoutModeAtom,
  layoutShellAtom,
} from "~/layouts/hybrid";
import { withSeparateTerrainSource } from "~/_utils/terrain-source";

import {
  focusedRegionsAtom,
  inspectedPointAtom,
  inspectedRegionIDsAtom,
  mapFilterAtom,
  selectedRegionAtom,
  selectedRegionIDAtom,
  type MapFilter,
  type Point,
} from "./state";

const SOURCE = "regions";
// The tileserver's MVT layer name: a cross-repo contract
const SOURCE_LAYER = "regions";

const classColor = [
  "match",
  ["get", "region_class"],
  "Physiographic",
  "#2f9a85",
  "Basin",
  "#d0692e",
  "Glacial",
  "#2f7fc1",
  "Ecoregion",
  "#6a9a3a",
  "#888888",
];

export function RegionsMap() {
  return h(ErrorBoundary, h(RegionsMapShell));
}

/** The map shell is `MapAreaContainer`, which supplies a map provider; the
 * content and split shells place the map in a plain cell, so it brings one. */
function RegionsMapShell() {
  const shell = useAtomValue(layoutShellAtom);
  if (shell === "map") {
    return h(RegionsMapInner, { standalone: false });
  }
  return h(MapboxMapProvider, h(RegionsMapInner, { standalone: true }));
}

function RegionsMapInner({ standalone }) {
  const { mapStyle, showLabels } = useInsetMapStyleProps();
  const point = useAtomValue(inspectedPointAtom);
  const setPosition = useInspectPoint();
  const overlayStyles = useOverlayStyles();
  const setFeatures = useFeatureIDs();

  const transformStyle = useCallback(
    (style) => {
      const next = withSeparateTerrainSource(style);
      if (showLabels) return next;
      return removeMapLabels(next, true);
    },
    [showLabels]
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
      h(FitToSelection, { key: "fit" }),
      h(MapResizer, { key: "resizer" }),
    ]
  );
}

/** A click inspects the point, replacing any region picked from the list. */
function useInspectPoint() {
  const setPoint = useSetAtom(inspectedPointAtom);
  const setSelected = useSetAtom(selectedRegionIDAtom);
  return useCallback(
    (position: Point | null) => {
      if (position == null) {
        setPoint(null);
        return;
      }
      setSelected(null);
      setPoint({ lng: position.lng, lat: position.lat });
    },
    [setPoint, setSelected]
  );
}

/** Rendered features at the point, reduced to unique region ids. */
function useFeatureIDs() {
  const setIDs = useSetAtom(inspectedRegionIDsAtom);
  return useCallback(
    (features) => {
      const ids = new Set<number>();
      for (const feature of features ?? []) {
        if (feature.source !== SOURCE) continue;
        ids.add(feature.properties?.region_id);
      }
      setIDs([...ids].sort((a, b) => a - b));
    },
    [setIDs]
  );
}

/** Frame the region picked from the list. Bounds spanning more than half the
 * globe are global or wrap the antimeridian; fitting either shows the world. */
function FitToSelection() {
  const mapRef = useMapRef();
  const { isStyleLoaded } = useMapStatus();
  const bounds = useAtomValue(selectedRegionAtom)?.bounds ?? null;
  const key = bounds?.join(",") ?? null;

  useEffect(() => {
    const map = mapRef.current;
    if (map == null || !isStyleLoaded || bounds == null) return;
    const [west, south, east, north] = bounds;
    if (east - west > 180) return;
    map.fitBounds(
      [
        [west, south],
        [east, north],
      ],
      { padding: 50, maxZoom: 10 }
    );
  }, [key, isStyleLoaded]);

  return null;
}

/** The filters live in the list's panel, which the map-only mode unmounts, so
 * they go stale there; show every region. */
function useMapFilterExpression() {
  const mode = useAtomValue(layoutModeAtom);
  const mapFilter = useAtomValue(mapFilterAtom);
  return useMemo(() => {
    if (!hasContentPane(mode)) return null;
    return filterExpression(mapFilter);
  }, [mode, mapFilter]);
}

function filterExpression(mapFilter: MapFilter | null) {
  if (mapFilter == null) return null;
  const { sourceID, regionClass, ids } = mapFilter;
  const clauses: any[] = [];
  if (sourceID != null) clauses.push(["==", ["get", "source_id"], sourceID]);
  if (regionClass != null) {
    clauses.push(["==", ["get", "region_class"], regionClass]);
  }
  if (ids != null) clauses.push(["in", ["get", "region_id"], ["literal", ids]]);
  if (clauses.length === 0) return null;
  return ["all", ...clauses];
}

function useOverlayStyles() {
  const filter = useMapFilterExpression();
  const focused = useAtomValue(focusedRegionsAtom);
  const focusedKey = focused.map((row) => row.region_id).join(",");
  // Memoized: `MapView` resets the style whenever this array's identity changes
  return useMemo(() => {
    const focusedIDs = focused.map((row) => row.region_id);
    return [regionsStyle(filter, focusedIDs)];
  }, [filter, focusedKey]);
}

function withFilter(layer: any, filter: any[] | null) {
  if (filter == null) return layer;
  return { ...layer, filter };
}

function regionsStyle(filter: any[] | null, focusedIDs: number[]) {
  const focusFilter = ["in", ["get", "region_id"], ["literal", focusedIDs]];
  return {
    version: 8,
    sources: {
      [SOURCE]: {
        type: "vector",
        tiles: [`${burwellTileDomain}/regions/tiles/{z}/{x}/{y}`],
        maxzoom: 9,
      },
    },
    layers: [
      withFilter(
        {
          id: "regions-fill",
          type: "fill",
          source: SOURCE,
          "source-layer": SOURCE_LAYER,
          paint: { "fill-color": classColor, "fill-opacity": 0.12 },
        },
        filter
      ),
      withFilter(
        {
          id: "regions-line",
          type: "line",
          source: SOURCE,
          "source-layer": SOURCE_LAYER,
          paint: {
            "line-color": classColor,
            "line-width": 1,
            "line-opacity": 0.7,
          },
        },
        filter
      ),
      {
        id: "regions-focused-fill",
        type: "fill",
        source: SOURCE,
        "source-layer": SOURCE_LAYER,
        filter: focusFilter,
        paint: { "fill-color": classColor, "fill-opacity": 0.25 },
      },
      {
        id: "regions-focused-line",
        type: "line",
        source: SOURCE,
        "source-layer": SOURCE_LAYER,
        filter: focusFilter,
        paint: { "line-color": "#f5a623", "line-width": 2 },
      },
    ],
  };
}
