/** Swipe-to-compare diff of two Macrostrat map tilesets.
 *
 * The page is a generalization of `/dev/map/carto-compare`: two synchronized
 * maps under a draggable divider, both drawn with the same Macrostrat style so
 * that any visible difference is a difference in the *data*. Which two
 * tilesets are compared is a choice, not a fixture — `MAP_SOURCES` is the
 * registry, and the pair defaults to production carto against this
 * deployment's own.
 *
 * What the swipe can't answer is *what* changed at a particular place, since
 * only one side is visible there at a time. So clicking the map pins a
 * location and lists the units each side draws at it, behind a Left/Right
 * toggle; an entry the other side doesn't have is marked.
 *
 * The layout follows `/dev/map/legend`: no navbar and no context panel, with
 * everything above the content in a single column on the right.
 */

import hyper from "@macrostrat/hyper";
import {
  Button,
  HTMLSelect,
  NonIdealState,
  SegmentedControl,
  Tag,
} from "@blueprintjs/core";
import {
  CompareMapView,
  DetailPanelStyle,
  LocationPanel,
  MapAreaContainer,
} from "@macrostrat/map-interface";
import { buildMacrostratStyle } from "@macrostrat/map-styles";
import {
  DataField,
  IntervalField,
  LithologyList,
  useInteractionProps,
} from "@macrostrat/data-components";
import {
  MacrostratDataProvider,
  useMacrostratDefs,
} from "@macrostrat/data-provider";
import { useDarkMode } from "@macrostrat/ui-components";
import { removeMapLabels, type MapPosition } from "@macrostrat/mapbox-utils";
import {
  apiV2Prefix,
  apiV3Prefix,
  burwellTileDomain,
  mapboxAccessToken,
} from "@macrostrat-web/settings";
import mapboxgl from "mapbox-gl";
import { atom, useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useMemo, useState } from "react";
import { atomWithSearchParam, locationAtom } from "~/_utils/url-atoms";
import { lastMapPositionAtom } from "~/_utils/last-map-position";
import { hashWithMapPosition, initialMapPosition } from "~/_utils/map-position";
import {
  BaseLayerForm,
  Basemap,
  basemapStyle,
  PageBreadcrumbs,
} from "~/components";
import { NavigationLinkProvider } from "~/_providers/navigation";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

/** The fill layer `buildMacrostratStyle` builds over the `units` source-layer.
 * Both sides are drawn with that style, so this is what a click queries. */
const CARTO_FILL_LAYER = "burwell_fill";

/** Identical style parameters for both sides, so the comparison is of data. */
/** The fill opacity the style is built with, and what the highlight restores. */
const BASE_FILL_OPACITY = 0.5;

const CARTO_STYLE_OPTS = {
  tileserverDomain: burwellTileDomain,
  fillOpacity: BASE_FILL_OPACITY,
  strokeOpacity: 0.4,
  lineOpacity: 0.8,
};

/** One comparable tileset.
 *
 * Anything that serves the `units` and `lines` MVT layers the Macrostrat style
 * expects can be listed here — the page never assumes carto beyond that. */
interface MapSource {
  slug: string;
  label: string;
  description: string;
  /** A `{z}/{x}/{y}` tile template. */
  tiles: string;
  /** The v3 compilation whose `/map/{slug}/units` route describes these tiles,
   * where there is one.
   *
   * Only the dynamic tiles need it: they carry a legend entry's id, color and
   * age range — enough to draw a unit, not enough to name one. The others
   * already ship their text in the tile. A source without a route is not a
   * problem, it just shows what its tiles carry. */
  units?: string;
}

const MAP_SOURCES: MapSource[] = [
  {
    slug: "carto",
    label: "Carto",
    description: "This deployment's carto tiles (tile_layers.carto).",
    tiles: `${burwellTileDomain}/carto/{z}/{x}/{y}`,
  },
  {
    slug: "carto-v2",
    label: "Carto v2",
    description: "In-development tiles, assembled from the map topology.",
    tiles: `${burwellTileDomain}/dev/carto/{z}/{x}/{y}`,
    units: "carto-v2",
  },
  {
    slug: "carto-slim",
    label: "Carto slim",
    description:
      "The slimmed tiles the main map draws (tile_layers.carto_slim).",
    tiles: `${burwellTileDomain}/carto-slim/{z}/{x}/{y}`,
  },
  {
    slug: "carto-production",
    label: "Carto (production)",
    description: "Production tiles, served from tiles.macrostrat.org.",
    tiles: "https://tiles.macrostrat.org/carto/{z}/{x}/{y}.mvt",
  },
];

const DEFAULT_LEFT = "carto";
const DEFAULT_RIGHT = "carto-v2";

function findSource(slug: string | null): MapSource | null {
  if (slug == null) return null;
  return MAP_SOURCES.find((d) => d.slug === slug) ?? null;
}

/** The Macrostrat overlay for one source: the shared style with its tile URL
 * swapped in, keeping the `burwell` source name and the `units`/`lines`
 * source-layers the style's layers address. */
function overlayFor(source: MapSource): mapboxgl.Style {
  const style = buildMacrostratStyle(CARTO_STYLE_OPTS);
  return {
    ...style,
    sources: {
      ...style.sources,
      burwell: { ...style.sources.burwell, tiles: [source.tiles] },
    },
  };
}

/** Where to start when neither the URL nor the last-viewed position says
 * otherwise: the continental US, where both carto generations have data. */
const DEFAULT_MAP_POSITION: MapPosition = {
  camera: { lng: -100, lat: 40, altitude: 1_500_000 },
};

type Side = "left" | "right";

/** A place on the map, and the zoom it was picked at -- which is what decides
 * the layer the tiles under the cursor were drawn from. */
interface Pin {
  lngLat: mapboxgl.LngLat;
  zoom: number;
}

/** The divider runs vertically, so the sides are always left and right. */
const SIDE_LABELS: Record<Side, string> = { left: "Left", right: "Right" };

// --- Page state ---

/** The camera, shared with the other map pages and restored on revisit. */
const mapPositionAtom = lastMapPositionAtom;

/** The camera in the URL hash, in the same `x`/`y`/`z` (plus `a`/`e`) form the
 * main map page uses. Routed through `locationAtom` rather than
 * `setHashString`, which rewrites the URL from the pathname up and would drop
 * the query params below. */
const mapPositionHashAtom = atom(null, (get, set, position: MapPosition) => {
  const loc = get(locationAtom);
  set(locationAtom, { ...loc, hash: hashWithMapPosition(loc.hash, position) });
});

/** A side's tileset, by slug, in the query string. The default stays out. */
function sourceAtom(key: string, defaultSlug: string) {
  const paramAtom = atomWithSearchParam(key);
  return atom(
    (get): MapSource => findSource(get(paramAtom)) ?? findSource(defaultSlug),
    (get, set, slug: string) => {
      let param: string | null = slug;
      if (slug === defaultSlug) param = null;
      set(paramAtom, param);
    }
  );
}

const leftSourceAtom = sourceAtom("left", DEFAULT_LEFT);
const rightSourceAtom = sourceAtom("right", DEFAULT_RIGHT);

/** The base map style, persisted in the URL as on the other map pages. */
const basemapParamAtom = atomWithSearchParam("basemap");
const basemapAtom = atom(
  (get): Basemap => {
    const value = get(basemapParamAtom);
    if (value === Basemap.Satellite) return value as Basemap;
    return Basemap.Basic;
  },
  (get, set, value: Basemap) => {
    let param: Basemap | null = value;
    if (value === Basemap.Basic) param = null;
    set(basemapParamAtom, param);
  }
);

/** Whether the basemap's text labels are shown. On by default. */
const labelsParamAtom = atomWithSearchParam("labels");
const showLabelsAtom = atom(
  (get) => get(labelsParamAtom) !== "off",
  (get, set, value: boolean) => {
    let param: string | null = null;
    if (!value) param = "off";
    set(labelsParamAtom, param);
  }
);

/** The pinned location, in the query string — the page is about a place, so a
 * link to it has to carry which place. Rounded to the resolution any Macrostrat
 * dataset has, which also keeps the URL stable. */
const pinParamAtom = atomWithSearchParam("pin");
const pinLocationAtom = atom(
  (get) => parsePin(get(pinParamAtom)),
  (get, set, value: { lng: number; lat: number } | null) => {
    let param: string | null = null;
    if (value != null) {
      param = `${roundCoord(value.lng)},${roundCoord(value.lat)}`;
    }
    set(pinParamAtom, param);
  }
);

function parsePin(param: string | null): { lng: number; lat: number } | null {
  if (param == null) return null;
  const [lng, lat] = param.split(",").map(Number);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  return { lng, lat };
}

/** Which side's units the panel is showing. Ephemeral — not in the URL. */
const selectedSideAtom = atom<Side>("left");

/** Nothing else is "selected" on this page: the pinned location is the
 * selection, and the units at it are what the panel describes. The map
 * highlight follows from that rather than from a second piece of state. */

// --- Page ---

export function Page() {
  const dark = useDarkMode();
  const basemap = useAtomValue(basemapAtom);
  const baseStyle = basemapStyle(basemap, dark?.isEnabled);
  const transformStyle = useLabelTransform();

  const leftSource = useAtomValue(leftSourceAtom);
  const rightSource = useAtomValue(rightSourceAtom);

  const mapPosition = useInitialMapPosition();
  const onMapMoved = useMapMovedHandler();

  // The "before" map runs in the container's own map context; the "after" map
  // gets an isolated one, so both are captured on the way out instead.
  const [leftMap, setLeftMap] = useState<mapboxgl.Map | null>(null);
  const [rightMap, setRightMap] = useState<mapboxgl.Map | null>(null);

  const [pin, onPick, clearPin] = usePin(mapPosition);
  const position = pin?.lngLat ?? null;
  useLocationMarker(leftMap, position, onPick);
  useLocationMarker(rightMap, position, onPick);

  const leftDrawn = useUnitsAtPosition(leftMap, position);
  const rightDrawn = useUnitsAtPosition(rightMap, position);
  const leftUnits = useDescribedUnits(leftSource, leftDrawn, pin);
  const rightUnits = useDescribedUnits(rightSource, rightDrawn, pin);
  const records = useUnitRecords(leftUnits, rightUnits);
  const stratNames = useStratNames(records);
  const column = useColumnAt(pin);
  const context = useMemo(
    () => ({ records, stratNames, column }),
    [records, stratNames, column]
  );

  useUnitHighlight(leftMap, leftDrawn);
  useUnitHighlight(rightMap, rightDrawn);

  // The divider decides which side is actually visible at the pin, so the panel
  // follows it rather than making you switch by hand.
  const [divider, setDivider] = useState(0.5);
  useSideFacingUp(leftMap, pin, divider);

  // Memoized: `MapView` re-applies the style — reloading every tile — whenever
  // the identity of `overlayStyles` changes.
  const before = useMemo(
    () => ({
      overlayStyles: [overlayFor(leftSource)],
      onMapLoaded: setLeftMap,
      // Only this side reports position: the cameras are linked, so the other
      // would report the same movement a second time.
      onMapMoved,
    }),
    [leftSource, onMapMoved]
  );

  const after = useMemo(
    () => ({
      overlayStyles: [overlayFor(rightSource)],
      onMapLoaded: setRightMap,
    }),
    [rightSource]
  );

  // The provider's definition maps are what resolve a record's lithology ids.
  const detailPanel = h(
    MacrostratDataProvider,
    { baseURL: apiV2Prefix },
    h(DiffPanel, {
      position,
      context,
      left: { source: leftSource, units: leftUnits },
      right: { source: rightSource, units: rightUnits },
      onClear: clearPin,
    })
  );

  return h(
    MapAreaContainer,
    { detailPanel, detailPanelStyle: DetailPanelStyle.FIXED },
    h(CompareMapView, {
      style: baseStyle,
      transformStyle,
      mapPosition,
      mapboxToken: mapboxAccessToken,
      before,
      after,
      onSlide: setDivider,
    })
  );
}

/** The camera to open at — see `~/_utils/map-position` for the order the sinks
 * are resolved in.
 *
 * Frozen on first render: `MapView` applies `mapPosition` at initialization
 * only, and subscribing to either source would re-render the page on every
 * map move.
 */
function useInitialMapPosition(): MapPosition {
  const [initial] = useState(() => initialMapPosition(DEFAULT_MAP_POSITION));
  return initial;
}

/** On every move, record the camera in the URL and in the shared last-viewed
 * position. */
function useMapMovedHandler() {
  const setStoredPosition = useSetAtom(mapPositionAtom);
  const setHashPosition = useSetAtom(mapPositionHashAtom);

  return useCallback(
    (position: MapPosition) => {
      setStoredPosition(position);
      setHashPosition(position);
    },
    [setStoredPosition, setHashPosition]
  );
}

/** Hide the basemap's own labels by stripping the label layers from the
 * resolved style, as the other map pages do. */
function useLabelTransform() {
  const showLabels = useAtomValue(showLabelsAtom);

  return useCallback(
    (style) => {
      if (showLabels) return style;
      return removeMapLabels(style, true);
    },
    [showLabels]
  );
}

// --- The pinned location ---

/** The pinned location, held in the URL.
 *
 * The zoom rides along in React state rather than the URL: it only decides
 * which layer of a stack the compilation route reports as current, and a link
 * that carried it would pin an answer to whatever zoom the sender happened to
 * be at. Restored from a shared link, it falls back to the camera's own zoom.
 */
function usePin(
  mapPosition: MapPosition
): [Pin | null, (lngLat: mapboxgl.LngLat, zoom: number) => void, () => void] {
  const [location, setLocation] = useAtom(pinLocationAtom);
  const [zoom, setZoom] = useState<number | null>(null);

  const onPick = useCallback(
    (lngLat: mapboxgl.LngLat, pickedZoom: number) => {
      setLocation({ lng: lngLat.lng, lat: lngLat.lat });
      setZoom(pickedZoom);
    },
    [setLocation]
  );

  const clearPin = useCallback(() => {
    setLocation(null);
    setZoom(null);
  }, [setLocation]);

  const pin = useMemo(() => {
    if (location == null) return null;
    return {
      lngLat: new mapboxgl.LngLat(location.lng, location.lat),
      zoom: zoom ?? mapPosition.target?.zoom ?? DEFAULT_PIN_ZOOM,
    };
  }, [location, zoom, mapPosition]);

  return [pin, onPick, clearPin];
}

/** Stands in when a pin arrives from a link and the camera has no zoom of its
 * own to read — the finest carto layer, which is the most detailed answer. */
const DEFAULT_PIN_ZOOM = 12;

/** Clicking either map pins a location; both then carry a marker at it, so the
 * point stays visible whichever side of the divider it falls on. */
function useLocationMarker(
  map: mapboxgl.Map | null,
  position: mapboxgl.LngLat | null,
  onPick: (lngLat: mapboxgl.LngLat, zoom: number) => void
) {
  useEffect(() => {
    if (map == null) return;
    const onClick = (e: mapboxgl.MapMouseEvent) =>
      onPick(e.lngLat, map.getZoom());
    map.on("click", onClick);
    return () => {
      map.off("click", onClick);
    };
  }, [map, onPick]);

  useEffect(() => {
    if (map == null || position == null) return;
    const marker = new mapboxgl.Marker().setLngLat(position).addTo(map);
    return () => {
      marker.remove();
    };
  }, [map, position]);
}

/** The units one map is drawing at the pinned location.
 *
 * Re-queried when the map goes idle as well as on the click itself, since a
 * click can land before the tiles under it have loaded and a source change
 * replaces them entirely.
 */
function useUnitsAtPosition(
  map: mapboxgl.Map | null,
  position: mapboxgl.LngLat | null
): any[] {
  const [units, setUnits] = useState<any[]>([]);

  useEffect(() => {
    if (map == null || position == null) {
      setUnits([]);
      return;
    }

    const update = () => {
      const next = queryUnitsAt(map, position);
      if (next == null) return;
      setUnits(next);
    };

    update();
    map.on("idle", update);
    return () => {
      map.off("idle", update);
    };
  }, [map, position]);

  return units;
}

/** Fill in what a side's tiles don't carry, from its `/map/{slug}/units` route.
 *
 * The tiles still decide *which* polygons are here — that is the comparison,
 * and keeping it a tile query is what lets the page compare sources the API has
 * never heard of. The route only supplies the text for polygons already found,
 * matched on `map_id`, so a source without a route (or a route that fails)
 * degrades to what its tiles carry rather than to nothing.
 */
function useDescribedUnits(
  source: MapSource,
  units: any[],
  pin: Pin | null
): any[] {
  const details = useUnitDescriptions(source, pin);

  return useMemo(() => {
    if (details.size === 0) return units;
    return units.map((unit) => describeUnit(unit, details.get(unit.map_id)));
  }, [units, details]);
}

const NO_DESCRIPTIONS: Map<number, any> = new Map();

/** The route's answer for the pinned location, by `map_id`.
 *
 * Keyed on the pin rather than on the units, so panning (which re-runs the tile
 * query on every idle) doesn't refetch. Every layer of a stack answers; where
 * one map appears in several, the layer the pin's zoom would have drawn wins,
 * since that is the one the tiles under the cursor came from.
 */
function useUnitDescriptions(source: MapSource, pin: Pin | null) {
  const [details, setDetails] = useState(NO_DESCRIPTIONS);

  useEffect(() => {
    setDetails(NO_DESCRIPTIONS);
    if (source.units == null || pin == null) return;

    const controller = new AbortController();
    fetchUnitDescriptions(source.units, pin, controller.signal).then(
      setDetails,
      () => setDetails(NO_DESCRIPTIONS)
    );

    return () => controller.abort();
  }, [source.units, pin]);

  return details;
}

async function fetchUnitDescriptions(
  compilation: string,
  pin: Pin,
  signal: AbortSignal
): Promise<Map<number, any>> {
  const query = new URLSearchParams({
    lng: String(roundCoord(pin.lngLat.lng)),
    lat: String(roundCoord(pin.lngLat.lat)),
    zoom: String(Math.round(pin.zoom)),
  });

  const res = await fetch(`${apiV3Prefix}/map/${compilation}/units?${query}`, {
    signal,
  });
  if (!res.ok) throw new Error(`Units request failed (${res.status})`);

  const byMapID = new Map<number, any>();
  for (const unit of await res.json()) {
    const existing = byMapID.get(unit.map_id);
    if (existing != null && existing.is_current_layer) continue;
    byMapID.set(unit.map_id, unit);
  }
  return byMapID;
}

/** The tile's properties, with anything the route knows and the tile doesn't
 * laid over them. Empty values don't overwrite: a legend entry with no
 * description shouldn't blank out one the tile happened to carry. */
function describeUnit(unit: any, description: any | undefined): any {
  if (description == null) return unit;

  const described = { ...unit };
  for (const [key, value] of Object.entries(description)) {
    if (value == null || value === "") continue;
    if (Array.isArray(value) && value.length === 0) continue;
    described[key] = value;
  }
  return described;
}

/** Five decimal places is ~1 m at the equator, past the resolution of any
 * Macrostrat dataset, and keeps the request URL stable. */
function roundCoord(value: number): number {
  return Math.round(value * 1e5) / 1e5;
}

/** Dim everything but the units at the pinned location.
 *
 * Keyed on `map_id` rather than `legend_id`: a legend entry is drawn by many
 * polygons, and the ones being described are those under the pin. Each side
 * highlights what *it* draws there, so the two maps can disagree about what is
 * lit up — which is the comparison.
 *
 * Reapplied on style load because a style reload drops paint properties, and
 * this page reloads styles whenever a side's tileset changes.
 */
function useUnitHighlight(map: mapboxgl.Map | null, units: any[]) {
  // The ids as a string, so a re-query returning the same polygons doesn't
  // re-run the operator.
  const key = units
    .map((d) => d.map_id)
    .filter((d) => d != null)
    .join(",");

  useEffect(() => {
    if (map == null) return;

    const apply = () => {
      if (map.getLayer(CARTO_FILL_LAYER) == null) return;
      if (key === "") {
        map.setPaintProperty(
          CARTO_FILL_LAYER,
          "fill-opacity",
          BASE_FILL_OPACITY
        );
        return;
      }
      map.setPaintProperty(CARTO_FILL_LAYER, "fill-opacity", [
        "case",
        ["in", ["get", "map_id"], ["literal", key.split(",").map(Number)]],
        0.85,
        0.1,
      ]);
    };

    // `style.load`, not `styledata`: the latter fires for every style mutation
    // including this one's, so setting a paint property inside it re-triggers
    // it. This is the shape `useMapStyleOperator` uses, which the isolated
    // "after" map cannot reach from out here.
    if (map.isStyleLoaded()) apply();
    map.on("style.load", apply);
    return () => {
      map.off("style.load", apply);
    };
  }, [map, key]);
}

/** Show the side that is actually visible at the pin.
 *
 * Only one side is drawn at any one place, so which one the panel should be
 * describing is a fact about where the divider sits relative to the pin, not a
 * choice. Dragging the divider across the pin swaps the panel with it; picking
 * a new location selects the side that was showing there. A manual toggle
 * survives until one of those happens.
 */
function useSideFacingUp(
  map: mapboxgl.Map | null,
  pin: Pin | null,
  divider: number
) {
  const setSide = useSetAtom(selectedSideAtom);

  useEffect(() => {
    if (map == null || pin == null) return;
    const width = map.getContainer().clientWidth;
    if (width === 0) return;

    const pinFraction = map.project(pin.lngLat).x / width;
    setSide(pinFraction <= divider ? "left" : "right");
  }, [map, pin, divider, setSide]);
}

/** The rest of what Macrostrat knows about these polygons, from the v2
 * `/geologic_units/map` route.
 *
 * Keyed on `map_id`, which every tileset carries, so this works for a side the
 * compilation route has never heard of — and it is the same record the main
 * map's info panel is built from: linked stratigraphic names and Macrostrat
 * units, matched lithologies, interval names, and the source's full citation.
 * One request covers both sides.
 */
function useUnitRecords(leftUnits: any[], rightUnits: any[]): UnitRecords {
  const [records, setRecords] = useState(NO_RECORDS);

  const mapIDs = useMemo(() => {
    const ids = new Set<number>();
    for (const unit of [...leftUnits, ...rightUnits]) {
      if (unit.map_id != null) ids.add(unit.map_id);
    }
    return [...ids].sort((a, b) => a - b);
  }, [leftUnits, rightUnits]);

  // The joined ids, so a re-query of the same polygons doesn't refetch.
  const key = mapIDs.join(",");

  useEffect(() => {
    if (key === "") {
      setRecords(NO_RECORDS);
      return;
    }

    const controller = new AbortController();
    fetchUnitRecords(key, controller.signal).then(setRecords, () =>
      setRecords(NO_RECORDS)
    );

    return () => controller.abort();
  }, [key]);

  return records;
}

interface UnitRecords {
  byMapID: Map<number, any>;
  /** The full citation for a source, by `source_id`. */
  refs: Record<string, string>;
}

const NO_RECORDS: UnitRecords = { byMapID: new Map(), refs: {} };

async function fetchUnitRecords(
  mapIDs: string,
  signal: AbortSignal
): Promise<UnitRecords> {
  const res = await fetch(
    `${apiV2Prefix}/geologic_units/map?map_id=${mapIDs}`,
    { signal }
  );
  if (!res.ok) throw new Error(`Unit records request failed (${res.status})`);

  // A raw fetch, so the v2 envelope is still on it.
  const { data = [], refs = {} } = (await res.json())?.success ?? {};

  const byMapID = new Map<number, any>();
  for (const record of data) {
    byMapID.set(record.map_id, record);
  }
  return { byMapID, refs };
}

/** The matched stratigraphic names, by id.
 *
 * The unit records carry `strat_names` as bare ids; the lexicon links need
 * names to show. One request for every id across both sides.
 */
function useStratNames(records: UnitRecords): Map<number, string> {
  const [names, setNames] = useState(NO_STRAT_NAMES);

  const key = useMemo(() => {
    const ids = new Set<number>();
    for (const record of records.byMapID.values()) {
      for (const id of record.strat_names ?? []) ids.add(id);
    }
    return [...ids].sort((a, b) => a - b).join(",");
  }, [records]);

  useEffect(() => {
    if (key === "") {
      setNames(NO_STRAT_NAMES);
      return;
    }

    const controller = new AbortController();
    fetchStratNames(key, controller.signal).then(setNames, () =>
      setNames(NO_STRAT_NAMES)
    );

    return () => controller.abort();
  }, [key]);

  return names;
}

const NO_STRAT_NAMES: Map<number, string> = new Map();

async function fetchStratNames(
  ids: string,
  signal: AbortSignal
): Promise<Map<number, string>> {
  const res = await fetch(
    `${apiV2Prefix}/defs/strat_names?strat_name_id=${ids}`,
    { signal }
  );
  if (!res.ok) throw new Error(`Strat name request failed (${res.status})`);

  const names = new Map<number, string>();
  for (const d of (await res.json())?.success?.data ?? []) {
    let label = d.strat_name;
    if (d.rank != null && d.rank !== "") label = `${d.strat_name} ${d.rank}`;
    names.set(d.strat_name_id, label);
  }
  return names;
}

/** The Macrostrat column covering the pin.
 *
 * Whether there is one at all is part of what this page is checking: without a
 * column there is no regional stratigraphy for the main map to show beside a
 * map unit, however well attributed the unit itself is.
 */
function useColumnAt(pin: Pin | null) {
  const [column, setColumn] = useState<any>(null);

  const lng = pin == null ? null : roundCoord(pin.lngLat.lng);
  const lat = pin == null ? null : roundCoord(pin.lngLat.lat);

  useEffect(() => {
    setColumn(null);
    if (lng == null || lat == null) return;

    const controller = new AbortController();
    fetchColumnAt(lng, lat, controller.signal).then(setColumn, () =>
      setColumn(null)
    );

    return () => controller.abort();
  }, [lng, lat]);

  return column;
}

async function fetchColumnAt(lng: number, lat: number, signal: AbortSignal) {
  const res = await fetch(`${apiV2Prefix}/columns?lng=${lng}&lat=${lat}`, {
    signal,
  });
  if (!res.ok) throw new Error(`Column request failed (${res.status})`);
  return (await res.json())?.success?.data?.[0] ?? null;
}

/** The unit properties rendered at a position, or null when the map can't
 * answer yet — the overlay isn't loaded, or the point has been panned out of
 * view, in which case the last answer stands rather than reading as "nothing
 * here". */
function queryUnitsAt(
  map: mapboxgl.Map,
  position: mapboxgl.LngLat
): any[] | null {
  if (map.getLayer(CARTO_FILL_LAYER) == null) return null;
  if (!map.getBounds().contains(position)) return null;

  const features = map.queryRenderedFeatures(map.project(position), {
    layers: [CARTO_FILL_LAYER],
  });

  // One polygon can come back once per tile it straddles.
  const seen = new Set<any>();
  const units = [];
  for (const feature of features) {
    const props = feature.properties ?? {};
    const key = props.map_id ?? props.legend_id ?? units.length;
    if (seen.has(key)) continue;
    seen.add(key);
    units.push(props);
  }
  return units;
}

// --- The page's single column ---

interface SideData {
  source: MapSource;
  units: any[];
}

function DiffPanel({ position, context, left, right, onClear }) {
  // With a location pinned the panel *is* the selection: it takes the whole
  // column under `LocationPanel`'s standard header, which carries the
  // coordinates and the dismiss control, and gives it back when cleared.
  // Every tag inside resolves its own link through the ambient interaction
  // provider — the same mechanism the rest of the site's lexicon links use.
  if (position != null) {
    return h(
      NavigationLinkProvider,
      h(
        LocationPanel,
        { position, onClose: onClear },
        h(LocationDiff, { context, left, right })
      )
    );
  }

  return h(LocationPanel, { headerElement: h(PageHeader) }, h(EmptyState));
}

/** Everything above the content, when nothing is pinned. */
function PageHeader() {
  const [basemap, setBasemap] = useAtom(basemapAtom);
  const [showLabels, setShowLabels] = useAtom(showLabelsAtom);

  return h("header.page-header", [
    h(PageBreadcrumbs, { separateTitle: false }),
    h("p.page-description", [
      "Two tilesets under a draggable divider, drawn with the same style — so ",
      "anything you can see is a difference in the data. Click the map to see ",
      "what each side has there, and whether it carries what the main map needs.",
    ]),
    h(SourcePicker),
    h(BaseLayerForm, { basemap, setBasemap, showLabels, setShowLabels }),
  ]);
}

/** Which tileset sits on each side of the divider. A two-row grid — side, its
 * picker, and the swap button spanning both rows on the right. */
function SourcePicker() {
  const [leftSource, setLeftSource] = useAtom(leftSourceAtom);
  const [rightSource, setRightSource] = useAtom(rightSourceAtom);

  const swap = () => {
    const left = leftSource.slug;
    setLeftSource(rightSource.slug);
    setRightSource(left);
  };

  return h("div.source-picker", [
    h("label.source-label", SIDE_LABELS.left),
    h(SourceSelect, { source: leftSource, setSource: setLeftSource }),
    h(Button, {
      className: "swap-button",
      icon: "swap-vertical",
      minimal: true,
      small: true,
      title: "Swap sides",
      onClick: swap,
    }),
    h("label.source-label", SIDE_LABELS.right),
    h(SourceSelect, { source: rightSource, setSource: setRightSource }),
  ]);
}

function SourceSelect({ source, setSource }) {
  return h(HTMLSelect, {
    fill: true,
    minimal: true,
    value: source.slug,
    onChange: (e) => setSource(e.currentTarget.value),
    options: MAP_SOURCES.map((d) => ({ label: d.label, value: d.slug })),
  });
}

function EmptyState() {
  return h(NonIdealState, {
    icon: "map-marker",
    title: "Pick a location",
    description: "Click the map to see what each side draws there.",
  });
}

/** What each side has at the pinned location, one side at a time. */
function LocationDiff({ context, left, right }) {
  const [side, setSide] = useAtom(selectedSideAtom);

  let shown: SideData = left;
  if (side === "right") {
    shown = right;
  }

  return h("div.location-diff", [
    h(SideToggle, { side, setSide, left, right }),
    h(UnitList, { units: shown.units, context }),
  ]);
}

/** Named by what is being compared rather than by which side of the divider it
 * is on: "Carto v2" is the thing you are looking for, and the divider already
 * says where it is. */
function SideToggle({ side, setSide, left, right }) {
  return h(SegmentedControl, {
    className: "side-toggle",
    fill: true,
    small: true,
    options: [
      { label: left.source.label, value: "left" },
      { label: right.source.label, value: "right" },
    ],
    value: side,
    onValueChange: (value) => setSide(value as Side),
  });
}

function UnitList({ units, context }) {
  if (units.length === 0) {
    return h(NonIdealState, {
      icon: "disable",
      title: "No units here",
      description: "This side draws nothing at the pinned location.",
    });
  }

  return h(
    "div.unit-list",
    units.map((unit, i) =>
      h(UnitRow, {
        key: unit.map_id ?? i,
        unit,
        context,
        record: context.records.byMapID.get(unit.map_id),
        reference: context.records.refs[String(unit.source_id)],
      })
    )
  );
}

/** One unit, shown whole. Nothing collapses: the location was picked
 * deliberately and there are rarely more than a few units at it. */
function UnitRow({ unit, context, record, reference }) {
  return h("div.unit-row", [
    h("div.unit-header", [
      h(ColorSwatch, { color: unit.color }),
      h("span.unit-name", unitName(unit)),
      h.if(unit.age != null && unit.age !== "")(
        Tag,
        { minimal: true, className: "age-tag" },
        unit.age
      ),
    ]),
    h(UnitDetails, { unit, context, record, reference }),
  ]);
}

/** What the main map would have to show for this unit.
 *
 * The page exists to answer whether a map carries the attributes `/map` needs,
 * so the fields and the links mirror that panel: stratigraphic names and
 * lithologies reach the lexicon, and the location reaches its column.
 */
function UnitDetails({ unit, context, record, reference }) {
  const { lith, descrip, comments } = unit;

  return h("div.unit-details", [
    h(StratNamesField, { record, stratNames: context.stratNames }),
    h(AgeFields, { unit, record }),
    h.if(lith != null && lith !== "")(DataField, {
      label: "Lithology",
      value: lith,
    }),
    h(LithologiesField, { record }),
    h.if(descrip != null && descrip !== "")(DataField, {
      label: "Description",
      value: descrip,
    }),
    h.if(comments != null && comments !== "")(DataField, {
      label: "Comments",
      value: comments,
    }),
    h(ColumnField, { record, column: context.column }),
    h(UnitProvenance, { unit }),
    h.if(reference != null)(DataField, {
      label: "Reference",
      value: reference,
      className: "reference",
    }),
    h("div.identifiers", [
      h.if(unit.map_id != null)(DataField, {
        label: "Map ID",
        value: unit.map_id,
      }),
      h.if(unit.legend_id != null)(DataField, {
        label: "Legend ID",
        value: unit.legend_id,
      }),
    ]),
  ]);
}

/** The matched stratigraphic names, each a link into the lexicon. Whether a map
 * unit resolves to a name at all is one of the things this page is checking. */
function StratNamesField({ record, stratNames }) {
  const ids: number[] = record?.strat_names ?? [];

  if (ids.length === 0) {
    const text = record?.strat_name;
    if (text == null || text === "") return null;
    // Named by the source map, but matched to nothing in the lexicon.
    return h(DataField, { label: "Stratigraphic name" }, [
      text,
      h("span.unmatched", " (unmatched)"),
    ]);
  }

  return h(
    DataField,
    { label: ids.length === 1 ? "Stratigraphic name" : "Stratigraphic names" },
    h(
      "div.linked-list",
      ids.map((id) =>
        h(StratNameLink, { key: id, id, name: stratNames.get(id) })
      )
    )
  );
}

/** The same shape `/map`'s info drawer uses: an anchor when the interaction
 * provider knows where the item lives, plain text when it doesn't. */
function StratNameLink({ id, name }) {
  const interactionProps = useInteractionProps({ strat_name_id: id });
  return h("a.lex-link", interactionProps, name ?? `#${id}`);
}

/** Matched lithologies, as the standard tags used everywhere else. They resolve
 * their own lexicon links through the ambient interaction provider. */
function LithologiesField({ record }) {
  const lithologies = useResolvedLithologies(record?.liths);
  if (lithologies.length === 0) return null;
  return h(LithologyList, { label: "Lithologies", lithologies });
}

/** Age and interval, as the main map shows them: the map's own age text, then
 * the matched intervals as standard tags carrying their age range. */
function AgeFields({ unit, record }) {
  const intervals = useResolvedIntervals([
    record?.b_int_id ?? unit.b_interval,
    record?.t_int_id ?? unit.t_interval,
  ]);

  return h([
    h.if(unit.age != null && unit.age !== "")(DataField, {
      label: "Age",
      value: unit.age,
    }),
    h.if(intervals.length > 0)(IntervalField, {
      intervals,
      showAgeRange: true,
    }),
  ]);
}

/** Interval ids resolved against the definitions the data provider manages,
 * in the shape `IntervalField` expects. */
function useResolvedIntervals(intervalIDs: (number | null | undefined)[]) {
  const intervalMap = useMacrostratDefs("intervals");
  const ids = intervalIDs.filter((d) => d != null);

  return useMemo(() => {
    if (intervalMap == null) return [];
    const seen = new Set<number>();
    return ids
      .map((id) => intervalMap.get(id))
      .filter((d) => d != null)
      .filter((d) => {
        if (seen.has(d.int_id)) return false;
        seen.add(d.int_id);
        return true;
      })
      .map((d) => ({ ...d, id: d.int_id }));
  }, [intervalMap, ids.join(",")]);
}

/** The column covering the pinned location, and the units this map unit matched
 * in it — both prerequisites for the regional stratigraphy the main map shows
 * beside a map unit.
 *
 * A matched unit links straight to it: the site's link builder turns
 * `{col_id, unit_id}` into `/columns/<col_id>#unit=<unit_id>`.
 */
function ColumnField({ record, column }) {
  if (column == null) return null;

  const matched: number[] = record?.macro_units ?? [];

  let units = h("span.unmatched", "no matched units");
  if (matched.length > 0) {
    units = h(
      "div.linked-list",
      matched
        .slice(0, MAX_LINKED_UNITS)
        .map((id) => h(ColumnUnitLink, { key: id, colID: column.col_id, id }))
    );
  }

  let overflow = null;
  if (matched.length > MAX_LINKED_UNITS) {
    overflow = h(
      "span.overflow",
      `and ${matched.length - MAX_LINKED_UNITS} more`
    );
  }

  return h(DataField, { label: "Column" }, [
    h(ColumnLink, { column }),
    units,
    overflow,
  ]);
}

/** Enough to show the match is real without turning the panel into a list. */
const MAX_LINKED_UNITS = 12;

function ColumnLink({ column }) {
  const interactionProps = useInteractionProps({ col_id: column.col_id });
  return h("a.lex-link.column-link", interactionProps, column.col_name);
}

function ColumnUnitLink({ colID, id }) {
  const interactionProps = useInteractionProps({ col_id: colID, unit_id: id });
  return h("a.lex-link.unit-link", interactionProps, `#${id}`);
}

/** Lithology ids resolved against the definitions the data provider manages. */
function useResolvedLithologies(lithIDs: number[] | undefined) {
  const lithMap = useMacrostratDefs("lithologies");

  return useMemo(() => {
    if (lithMap == null || lithIDs == null || lithIDs.length === 0) return [];
    return lithIDs
      .map((id) => lithMap.get(id))
      .filter((d) => d != null)
      .map((d) => ({ ...d, name: d.lith ?? d.name, color: d.color ?? "#888" }));
  }, [lithMap, lithIDs]);
}

/** Where the polygon came from, when the side's route says.
 *
 * The map that owns it need not be the layer member it is presented as — a face
 * in `carto-large` belongs to member `medium` even when the map beneath is two
 * levels down — and when two sides disagree at a point, this is usually why. */
function UnitProvenance({ unit }: { unit: any }) {
  const { source_name, unit_name, map_layer, priority } = unit;
  if (source_name == null && unit_name == null) return null;

  let layerValue = map_layer;
  if (priority != null && priority !== "") {
    layerValue = `${map_layer} · ${priority}`;
  }

  return h("div.provenance", [
    h.if(source_name != null)(DataField, {
      label: "Mapped by",
      value: source_name,
    }),
    h.if(unit_name != null && unit_name !== source_name)(DataField, {
      label: "Presented as",
      value: unit_name,
    }),
    h.if(map_layer != null)(DataField, { label: "Layer", value: layerValue }),
  ]);
}

function ColorSwatch({ color }: { color: string | null }) {
  if (color == null || color === "") return null;
  return h("span.color-swatch", { style: { backgroundColor: color } });
}

// --- Helpers ---

/** Tilesets disagree on the name column: the full carto tiles call it `name`,
 * the legend API `map_unit_name`. */
function unitName(unit: any): string {
  const name = unit?.name ?? unit?.map_unit_name;
  if (name == null || name === "") return "Unknown unit";
  return name;
}

function intervalRange(top: string, bottom: string): string {
  if (bottom == null || bottom === "" || bottom === top) return top;
  return `${bottom}–${top}`;
}
