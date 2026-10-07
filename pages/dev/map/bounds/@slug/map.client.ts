/** The map: the boundary as built, the drawn operations, and the draw control.
 *
 * The boundary comes from the tileserver's `/dev/topology/maps/<slug>` route
 * with `level=self` — a continental boundary runs to tens of megabytes, too
 * much to send as GeoJSON. Drawn `add` and `subtract` polygons are small and
 * come with the operation list. Both are overlay styles, so a basemap change
 * keeps them. Client only: mapbox-gl and the draw library need `window`. */
import { burwellTileDomain, mapboxAccessToken } from "@macrostrat-web/settings";
import { MapView } from "@macrostrat/map-interface";
import { MapboxMapProvider } from "@macrostrat/mapbox-react";
import { ErrorBoundary, useInDarkMode } from "@macrostrat/ui-components";
import h from "@macrostrat/hyper";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import type mapboxgl from "mapbox-gl";
import type { FeatureCollection, Geometry } from "geojson";
import { useCallback, useMemo, useState } from "react";

import { basemapStyle, Basemap } from "~/components";
import { GeometryDraw } from "~/components/geometry-draw/draw.client";
import { basemapAtom } from "~/_utils/basemap";
import { tileRequestTransform } from "~/_utils/compilations";
import { layoutShellAtom } from "~/layouts/hybrid";

import type { MapBoundary } from "./api";
import { boundaryAtom, draftAtom, drawingAtom, tileVersionAtom } from "./state";

const ADD_COLOR = "#2b8a3e";
const SUBTRACT_COLOR = "#c92a2a";

export function BoundaryMap() {
  return h(ErrorBoundary, h(BoundaryMapShell));
}

/** The map shell supplies a provider; the content and split shells don't. */
function BoundaryMapShell() {
  const shell = useAtomValue(layoutShellAtom);
  if (shell === "map") return h(BoundaryMapInner, { shell });
  return h(MapboxMapProvider, h(BoundaryMapInner, { shell }));
}

function BoundaryMapInner({ shell }) {
  const boundary = useAtomValue(boundaryAtom);
  const [map, setMap] = useState<mapboxgl.Map | null>(null);
  const style = useBasemap();
  const overlayStyles = useOverlayStyles(boundary);
  const draw = useDraftDraw(map);

  const onMapLoaded = useCallback(
    (m: mapboxgl.Map) => {
      setMap(m);
      fitToBoundary(m, boundary);
    },
    // Fit once, on load; later edits keep the user's view
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return h(
    MapView,
    {
      style,
      accessToken: mapboxAccessToken,
      overlayStyles,
      transformRequest: tileRequestTransform,
      onMapLoaded,
      // `MapAreaContainer` lays out a non-standalone map full-bleed
      standalone: shell !== "map",
      height: "100%",
    },
    h(GeometryDraw, draw)
  );
}

function useBasemap() {
  const inDarkMode = useInDarkMode();
  const basemap = useAtomValue(basemapAtom);
  return basemapStyle(basemap, inDarkMode) ?? basemapStyle(Basemap.Basic, inDarkMode);
}

/** The draft polygon, wired to the shared draw control. */
function useDraftDraw(map: mapboxgl.Map | null) {
  const [draft, setDraft] = useAtom(draftAtom);
  const drawing = useAtomValue(drawingAtom);
  const setDrawing = useSetAtom(drawingAtom);
  const onDrawEnd = useCallback(() => setDrawing(false), [setDrawing]);
  const onChange = useCallback((g: Geometry) => setDraft(g), [setDraft]);

  let drawMode = null;
  if (drawing) drawMode = "draw_polygon";

  return {
    map,
    geometry: draft,
    onChange,
    drawMode,
    onDrawEnd,
    color: "#1971c2",
    activeColor: "#4dabf7",
  };
}

function useOverlayStyles(boundary: MapBoundary | null) {
  const inDarkMode = useInDarkMode();
  const version = useAtomValue(tileVersionAtom);
  const slug = boundary?.slug;
  const operations = boundary?.operations;

  return useMemo(() => {
    if (slug == null) return [];
    let tone = 30;
    if (inDarkMode) tone = 235;
    const outline = `rgb(${tone}, ${tone}, ${tone})`;
    const tiles = `${burwellTileDomain}/dev/topology/maps/${encodeURIComponent(
      slug
    )}/{z}/{x}/{y}?level=self&v=${version}`;

    return [
      {
        version: 8,
        sources: {
          boundary: { type: "vector", tiles: [tiles] },
          operations: { type: "geojson", data: drawnOperations(operations ?? []) },
        },
        layers: [
          {
            id: "boundary-fill",
            type: "fill",
            source: "boundary",
            "source-layer": "maps",
            paint: { "fill-color": outline, "fill-opacity": 0.08 },
          },
          {
            id: "boundary-line",
            type: "line",
            source: "boundary",
            "source-layer": "maps",
            paint: { "line-color": outline, "line-width": 1 },
          },
          {
            id: "operations-fill",
            type: "fill",
            source: "operations",
            paint: { "fill-color": operationColor(), "fill-opacity": 0.25 },
          },
          {
            id: "operations-line",
            type: "line",
            source: "operations",
            paint: { "line-color": operationColor(), "line-width": 1.5 },
          },
        ],
      },
    ];
  }, [slug, operations, version, inDarkMode]);
}

function operationColor() {
  return ["match", ["get", "operation"], "add", ADD_COLOR, SUBTRACT_COLOR];
}

function drawnOperations(operations: MapBoundary["operations"]): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: operations
      .filter((o) => o.geometry != null)
      .map((o) => ({
        type: "Feature",
        id: o.id,
        properties: { operation: o.operation, position: o.position },
        geometry: o.geometry!,
      })),
  };
}

function fitToBoundary(map: mapboxgl.Map, boundary: MapBoundary | null) {
  const bbox = boundary?.bbox;
  if (bbox == null) return;
  const [w, s, e, n] = bbox;
  map.fitBounds(
    [
      [w, s],
      [e, n],
    ],
    { padding: 40, duration: 0 }
  );
}
