/** State, hooks, and helpers for the cache-management page. The page module
 * (`+Page.client.ts`) stays render-only; everything non-visual lives here. */

import { burwellTileDomain } from "@macrostrat-web/settings";
import { buildMacrostratStyleLayers } from "@macrostrat/map-styles";
import { useCallback, useState } from "react";
import { atom } from "jotai";
import { atomWithLocation } from "jotai-location";
import { Basemap } from "~/components";

// ─── Types ──────────────────────────────────────────────────────────────────

export type Bbox = [number, number, number, number];
export type ExpireMode = "viewport" | "map";

/** A constituent map selected by clicking its footprint on the map. */
export interface SelectedMap {
  source_id: number;
  name: string;
  slug: string;
  scale: string | null;
}

/** How the footprints layer renders maps: full source footprints, or the
 * realized topological faces actually composited into the carto map. */
export type FootprintMode = "all" | "active";

export interface InvalidationResult {
  deleted_l2: number;
  flushed_l1: boolean;
}

export interface InvalidationBody {
  // Region mode: bbox + zoom range. Map mode: source_ids (band derived server-side).
  bbox?: Bbox;
  min_zoom?: number;
  max_zoom?: number;
  source_ids?: number[];
}

// ─── Carto scale bands ────────────────────────────────────────────────────────

/** The carto layer composites a different map "scale" at each zoom band (see
 * tile_layers.carto_slim). Expiry targets one band, so we never need manual
 * zoom controls — the band follows from the selected map's scale (map mode) or
 * the current zoom (viewport mode). */
export interface ScaleBand {
  scale: string;
  minZoom: number;
  maxZoom: number;
}

export const SCALE_BANDS: ScaleBand[] = [
  { scale: "tiny", minZoom: 0, maxZoom: 2 },
  { scale: "small", minZoom: 3, maxZoom: 5 },
  { scale: "medium", minZoom: 6, maxZoom: 8 },
  { scale: "large", minZoom: 9, maxZoom: 14 },
];

const FULL_RANGE: ScaleBand = { scale: "all", minZoom: 0, maxZoom: 14 };

/** Band for a map's scale; falls back to the full zoom range if unrecognized. */
export function bandForScale(scale: string | null): ScaleBand {
  return SCALE_BANDS.find((b) => b.scale === scale) ?? FULL_RANGE;
}

/** Band visible at a given map zoom (clamps to the largest-scale band). */
export function bandForZoom(zoom: number): ScaleBand {
  const z = Math.floor(zoom);
  return SCALE_BANDS.find((b) => z >= b.minZoom && z <= b.maxZoom) ?? SCALE_BANDS[3];
}

// ─── URL-synced state atoms ───────────────────────────────────────────────────

const locationAtom = atomWithLocation({ replace: true });

/** Read/write atom backed by a single URL query param; writing null clears it. */
function atomWithSearchParam(key: string) {
  return atom(
    (get) => get(locationAtom).searchParams?.get(key) ?? null,
    (get, set, value: string | null) => {
      const loc = get(locationAtom);
      const searchParams = new URLSearchParams(loc.searchParams);
      if (value == null || value === "") {
        searchParams.delete(key);
      } else {
        searchParams.set(key, value);
      }
      set(locationAtom, { ...loc, searchParams });
    }
  );
}

const modeParamAtom = atomWithSearchParam("mode");
export const expireModeAtom = atom(
  (get): ExpireMode => (get(modeParamAtom) === "map" ? "map" : "viewport"),
  (get, set, value: ExpireMode) => {
    set(modeParamAtom, value === "viewport" ? null : value);
  }
);

const basemapParamAtom = atomWithSearchParam("basemap");
export const basemapAtom = atom(
  (get): Basemap => {
    const v = get(basemapParamAtom);
    if (v === Basemap.Satellite || v === Basemap.None) return v as Basemap;
    return Basemap.Basic;
  },
  (get, set, value: Basemap) => {
    set(basemapParamAtom, value === Basemap.Basic ? null : value);
  }
);

const cartoParamAtom = atomWithSearchParam("carto");
/** Whether the live Macrostrat carto map is shown underneath. On by default;
 * the "off" state is stored in the URL. */
export const showCartoAtom = atom(
  (get) => get(cartoParamAtom) !== "off",
  (get, set, value: boolean) => {
    set(cartoParamAtom, value ? null : "off");
  }
);

// ─── Invalidation request ─────────────────────────────────────────────────────

/** Encapsulates the POST /cache/invalidate request and its result/error state. */
export function useTileInvalidation() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<InvalidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const invalidate = useCallback(async (body: InvalidationBody) => {
    setResult(null);
    setError(null);
    setRunning(true);
    try {
      const resp = await fetch(`${burwellTileDomain}/cache/invalidate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!resp.ok) throw new Error(await resp.text());
      setResult(await resp.json());
    } catch (e) {
      setError(String(e));
    } finally {
      setRunning(false);
    }
  }, []);

  return { invalidate, running, result, error, reportError: setError };
}

/** Build the invalidation request body for the current selection, or an error
 * message when the selection is incomplete. Flat, early-return validation. */
export function buildInvalidationBody(opts: {
  mode: ExpireMode;
  selectedMaps: SelectedMap[];
  expireBbox: Bbox | null;
  zoom: number | null;
}): { body?: InvalidationBody; error?: string } {
  const { mode, selectedMaps, expireBbox, zoom } = opts;

  if (mode === "map") {
    if (selectedMaps.length === 0) {
      return { error: "Click one or more map footprints to select them" };
    }
    // Server derives each source's scale band from maps.sources.scale.
    return { body: { source_ids: selectedMaps.map((m) => m.source_id) } };
  }

  if (expireBbox == null || zoom == null) {
    return { error: "Map not ready — try again" };
  }
  const band = bandForZoom(zoom);
  return {
    body: { bbox: expireBbox, min_zoom: band.minZoom, max_zoom: band.maxZoom },
  };
}

// ─── Map helpers ──────────────────────────────────────────────────────────────

/** Geographic bbox of a screen rectangle, by unprojecting its corners against
 * the map canvas. `rect` and `canvas` are DOMRects (viewport-relative). */
export function bboxFromScreenRect(
  map: mapboxgl.Map,
  rect: DOMRect,
  canvas: DOMRect
): Bbox {
  const left = rect.left - canvas.left;
  const right = rect.right - canvas.left;
  const top = rect.top - canvas.top;
  const bottom = rect.bottom - canvas.top;
  const sw = map.unproject([left, bottom]);
  const ne = map.unproject([right, top]);
  return [sw.lng, sw.lat, ne.lng, ne.lat];
}

/** Parse a clicked "maps" vector-tile feature into a SelectedMap. */
export function selectedMapFromFeature(
  feature: mapboxgl.MapboxGeoJSONFeature | undefined
): SelectedMap | null {
  const p = feature?.properties;
  if (p == null || p.source_id == null) return null;
  return {
    source_id: Number(p.source_id),
    name: p.name ?? "",
    slug: p.slug ?? "",
    scale: p.scale ?? null,
  };
}

// ─── Map overlay styles ───────────────────────────────────────────────────────

const HIGHLIGHT = "#ff6600"; // viewport-expiry rectangle/area
const FOOTPRINT_OUTLINE = "#5c6066"; // prominent outline for all footprints
const SELECTED_FILL = "#2b2f36"; // dark grey fill for selected maps

/** The live Macrostrat geologic map (carto v2 tiles), for geographic context.
 * Source must be named "burwell" — that's what buildMacrostratStyleLayers
 * targets (source-layers `units` and `lines`). */
function cartoStyle(): mapboxgl.Style {
  return {
    version: 8,
    sources: {
      burwell: {
        type: "vector",
        tiles: [`${burwellTileDomain}/dev/carto/{z}/{x}/{y}`],
      },
    },
    layers: buildMacrostratStyleLayers({
      fillOpacity: 0.4,
      strokeOpacity: 0.4,
      lineOpacity: 0.8,
    }),
  };
}

/** Clickable carto map footprints (the /cache/footprints layer). The endpoint
 * picks the scale band by zoom (+dz) and serves full footprints or realized
 * faces per `mode`. Non-selected maps show only a prominent outline (no fill,
 * to keep the basemap visible); selected maps get a dark-grey fill. A nearly
 * invisible fill layer underlies everything so interiors are clickable. */
function footprintsStyle(opts: {
  mode: FootprintMode;
  dz: number;
  selectedIds: number[];
}): mapboxgl.Style {
  const { mode, dz, selectedIds } = opts;
  const isSelected = ["in", ["get", "source_id"], ["literal", selectedIds]];
  const tiles = `${burwellTileDomain}/cache/footprints/{z}/{x}/{y}?mode=${mode}&dz=${dz}`;
  const SRC = "footprints";
  const SRC_LAYER = "footprints";
  return {
    version: 8,
    sources: {
      [SRC]: { type: "vector", tiles: [tiles] },
    },
    layers: [
      // Invisible fill — gives clickable interiors without obscuring the map.
      {
        id: "footprints-hit",
        type: "fill",
        source: SRC,
        "source-layer": SRC_LAYER,
        paint: { "fill-color": FOOTPRINT_OUTLINE, "fill-opacity": 0.01 },
      },
      {
        id: "footprints-outline",
        type: "line",
        source: SRC,
        "source-layer": SRC_LAYER,
        paint: {
          "line-color": FOOTPRINT_OUTLINE,
          "line-width": 1.2,
          "line-opacity": 0.9,
        },
      },
      {
        id: "footprints-selected-fill",
        type: "fill",
        source: SRC,
        "source-layer": SRC_LAYER,
        filter: isSelected,
        paint: { "fill-color": SELECTED_FILL, "fill-opacity": 0.35 },
      },
      {
        id: "footprints-selected-outline",
        type: "line",
        source: SRC,
        "source-layer": SRC_LAYER,
        filter: isSelected,
        paint: { "line-color": SELECTED_FILL, "line-width": 2.5 },
      },
    ],
  };
}

/** The overlay stack: optional carto context map and the footprints layer.
 * These change only on infrequent events (footprint mode/dz, selection, carto
 * toggle); changing this array re-runs map.setStyle(), so the per-move
 * invalidation rectangle is drawn imperatively instead (see below). */
export function buildOverlayStyles(opts: {
  showCarto: boolean;
  footprintMode: FootprintMode;
  dz: number;
  selectedIds: number[];
}): mapboxgl.Style[] {
  const { showCarto, footprintMode, dz, selectedIds } = opts;
  const overlays: mapboxgl.Style[] = [];
  if (showCarto) overlays.push(cartoStyle());
  overlays.push(footprintsStyle({ mode: footprintMode, dz, selectedIds }));
  return overlays;
}

// ─── Imperative invalidation-area rectangle ───────────────────────────────────

export const EXPIRE_BBOX_SOURCE = "expire-bbox";
const EXPIRE_BBOX_LAYER = "expire-bbox-fill";

/** A bbox as a closed-ring GeoJSON polygon feature. */
export function bboxFeature(bbox: Bbox): GeoJSON.Feature {
  const [minx, miny, maxx, maxy] = bbox;
  return {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [minx, miny],
          [maxx, miny],
          [maxx, maxy],
          [minx, maxy],
          [minx, miny],
        ],
      ],
    },
    properties: {},
  };
}

const EMPTY_FC: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

/** Add the faint invalidation-area source/layer if absent (idempotent; safe to
 * call again after a setStyle wipes runtime sources). */
export function ensureExpireBboxLayer(map: mapboxgl.Map) {
  if (map.getSource(EXPIRE_BBOX_SOURCE) != null) return;
  map.addSource(EXPIRE_BBOX_SOURCE, { type: "geojson", data: EMPTY_FC });
  map.addLayer({
    id: EXPIRE_BBOX_LAYER,
    type: "fill",
    source: EXPIRE_BBOX_SOURCE,
    paint: { "fill-color": HIGHLIGHT, "fill-opacity": 0.05 },
  });
}

export function removeExpireBboxLayer(map: mapboxgl.Map) {
  if (map.getLayer(EXPIRE_BBOX_LAYER) != null) map.removeLayer(EXPIRE_BBOX_LAYER);
  if (map.getSource(EXPIRE_BBOX_SOURCE) != null) {
    map.removeSource(EXPIRE_BBOX_SOURCE);
  }
}
