/** Every reference geometry, invalid ones in red, with the selected one's
 * vertices and its reported invalidity point on top.
 *
 * Geometries come from `/refs.geojson` rather than tiles: a few dozen at most,
 * and drawn whole so a bad one shows as it is stored. On the globe a polygon
 * crossing the antimeridian the wrong way draws the long way round. */
import { mapboxAccessToken } from "@macrostrat-web/settings";
import { MapView } from "@macrostrat/map-interface";
import { MapboxMapProvider } from "@macrostrat/mapbox-react";
import { ErrorBoundary, ErrorCallout, useInDarkMode } from "@macrostrat/ui-components";
import h from "@macrostrat/hyper";
import { useAtomValue } from "jotai";
import type mapboxgl from "mapbox-gl";
import type { Feature, FeatureCollection, Geometry, Position } from "geojson";
import { useEffect, useMemo, useState } from "react";

import { basemapStyle, Basemap } from "~/components";
import { basemapAtom } from "~/_utils/basemap";
import { layoutShellAtom } from "~/layouts/hybrid";

import {
  fetchRefGeometries,
  invalidLocation,
  type ReferenceCollection,
} from "./api";
import { selectedIdAtom, selectedRefAtom } from "./state";

const DANGER = "#c92a2a";
const SELECTED = "#f5a623";

const emptyCollection: ReferenceCollection = { type: "FeatureCollection", features: [] };

export function RefMap() {
  return h(ErrorBoundary, h(RefMapShell));
}

/** The map shell supplies a provider; the content and split shells don't. */
function RefMapShell() {
  const shell = useAtomValue(layoutShellAtom);
  if (shell === "map") return h(RefMapInner, { shell });
  return h(MapboxMapProvider, h(RefMapInner, { shell }));
}

function RefMapInner({ shell }) {
  const [map, setMap] = useState<mapboxgl.Map | null>(null);
  const { geometries, error } = useGeometries();
  const style = useBasemap();
  const overlayStyles = useOverlayStyles(geometries);
  useZoomToSelected(map);

  let errorCallout = null;
  if (error != null) errorCallout = h(ErrorCallout, { error });

  return h([
    errorCallout,
    h(MapView, {
      style,
      accessToken: mapboxAccessToken,
      projection: { name: "globe" },
      overlayStyles,
      onMapLoaded: setMap,
      // `MapAreaContainer` lays out a non-standalone map full-bleed
      standalone: shell !== "map",
      height: "100%",
    }),
  ]);
}

function useGeometries() {
  const [geometries, setGeometries] = useState<ReferenceCollection>(emptyCollection);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetchRefGeometries(controller.signal)
      .then(setGeometries)
      .catch((err) => {
        if (!controller.signal.aborted) setError(err);
      });
    return () => controller.abort();
  }, []);
  return { geometries, error };
}

function useBasemap() {
  const inDarkMode = useInDarkMode();
  const basemap = useAtomValue(basemapAtom);
  return basemapStyle(basemap, inDarkMode) ?? basemapStyle(Basemap.Basic, inDarkMode);
}

/** Frame the selection; a globe-wide one frames the globe, which is the point. */
function useZoomToSelected(map: mapboxgl.Map | null) {
  const selected = useAtomValue(selectedRefAtom);
  const bbox = selected?.bbox;
  const id = selected?.id;
  useEffect(() => {
    if (map == null || bbox == null) return;
    const [w, s, e, n] = bbox;
    map.fitBounds(
      [
        [w, s],
        [e, n],
      ],
      { padding: 60, maxZoom: 10 }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- on selection only
  }, [map, id]);
}

function useOverlayStyles(refs: ReferenceCollection) {
  const inDarkMode = useInDarkMode();
  const selectedId = useAtomValue(selectedIdAtom);

  return useMemo(() => {
    let tone = 30;
    if (inDarkMode) tone = 235;
    const plain = `rgb(${tone}, ${tone}, ${tone})`;
    const selected = refs.features.find((f) => f.id === selectedId) ?? null;

    return [
      {
        version: 8,
        sources: {
          refs: { type: "geojson", data: refs },
          vertices: { type: "geojson", data: vertexFeatures(selected) },
        },
        layers: [
          {
            id: "refs-fill",
            type: "fill",
            source: "refs",
            paint: { "fill-color": problemColor(plain), "fill-opacity": 0.06 },
          },
          {
            id: "refs-line",
            type: "line",
            source: "refs",
            paint: { "line-color": problemColor(plain), "line-width": 1.2 },
          },
          {
            id: "refs-selected-fill",
            type: "fill",
            source: "refs",
            filter: ["==", ["get", "id"], selectedId ?? -1],
            paint: { "fill-color": SELECTED, "fill-opacity": 0.2 },
          },
          {
            id: "refs-selected-line",
            type: "line",
            source: "refs",
            filter: ["==", ["get", "id"], selectedId ?? -1],
            paint: { "line-color": SELECTED, "line-width": 2.5 },
          },
          {
            id: "refs-selected-vertices",
            type: "circle",
            source: "vertices",
            filter: ["==", ["get", "kind"], "vertex"],
            paint: {
              "circle-radius": 2.5,
              "circle-color": SELECTED,
              "circle-stroke-color": plain,
              "circle-stroke-width": 0.5,
            },
          },
          {
            id: "refs-invalid-point",
            type: "circle",
            source: "vertices",
            filter: ["==", ["get", "kind"], "invalid"],
            paint: {
              "circle-radius": 7,
              "circle-color": "transparent",
              "circle-stroke-color": DANGER,
              "circle-stroke-width": 2.5,
            },
          },
        ],
      },
    ];
  }, [refs, selectedId, inDarkMode]);
}

function problemColor(plain: string) {
  return ["case", ["==", ["get", "is_valid"], false], DANGER, plain];
}

/** The selected geometry's vertices, and where PostGIS says it is invalid. */
function vertexFeatures(
  selected: ReferenceCollection["features"][number] | null
): FeatureCollection {
  const features: Feature[] = [];
  if (selected?.geometry != null) {
    for (const coordinates of positionsOf(selected.geometry)) {
      features.push(point(coordinates, "vertex"));
    }
    const invalid = invalidLocation(selected.properties);
    if (invalid != null) features.push(point(invalid, "invalid"));
  }
  return { type: "FeatureCollection", features };
}

function point(coordinates: Position, kind: string): Feature {
  return {
    type: "Feature",
    properties: { kind },
    geometry: { type: "Point", coordinates },
  };
}

function positionsOf(geometry: Geometry): Position[] {
  switch (geometry.type) {
    case "Point":
      return [geometry.coordinates];
    case "MultiPoint":
    case "LineString":
      return geometry.coordinates;
    case "MultiLineString":
    case "Polygon":
      return geometry.coordinates.flat();
    case "MultiPolygon":
      return geometry.coordinates.flat(2);
    case "GeometryCollection":
      return geometry.geometries.flatMap(positionsOf);
  }
}
