/** The live homepage hero: a pitched, terrain-lit satellite map with
 * Macrostrat's geology over it, the stratigraphic column beneath the map's
 * centre standing beside it — beside, not over: the two are cells of one grid,
 * so the column never covers the map it came from. Over the map itself: the
 * "Explore" masthead top-left and, bottom-left, the area's name and the age
 * range showing. The carousel sits under the frame.
 *
 * Client-only (mapbox-gl), and loaded only once the reader reaches for the
 * map: until then the page shows a snapshot of it (`hero-stage.ts`), and that
 * snapshot stays over the live map until the map has drawn itself.
 *
 * `HeroMap` is also what the snapshot route renders, in its `snapshot` mode,
 * so the still and the live map come from the same code.
 *
 * Two things are linked:
 *
 * - **The centre of the map** picks the column, and the geologic map credited
 *   underneath. Keyed by point, which is a stopgap — see the "Column spatial
 *   queries" feature area.
 * - **A click, on either the map or the column,** filters by age: the full
 *   bounds of the intervals the clicked unit spans, so picking something
 *   Aptian–Albian brings in everything else Aptian–Albian. Whatever falls
 *   outside dims, on both the map and the column.
 */
import h from "./hero.module.sass";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { MapView } from "@macrostrat/map-interface";
import { buildMacrostratStyle } from "@macrostrat/map-styles";
import mapboxgl from "mapbox-gl";
import { setGeoJSON, setMapPosition } from "@macrostrat/mapbox-utils";
import {
  LocationFocusButton,
  MapboxMapProvider,
  PositionFocusState,
  isCentered,
  useFocusState,
  useMapInitialized,
  useMapRef,
  useMapStyleOperator,
  useOverlayStyle,
} from "@macrostrat/mapbox-react";
import {
  Column,
  HybridScaleType,
  UnitComponent,
} from "@macrostrat/column-views";
import { ColumnAxisType } from "@macrostrat/column-components";
import {
  MacrostratDataProvider,
  useMacrostratDefs,
} from "@macrostrat/data-provider";
import { IntervalField } from "@macrostrat/data-components";
import { ErrorBoundary, useInDarkMode } from "@macrostrat/ui-components";
import {
  asChromaColor,
  getLuminanceAdjustedColorScheme,
} from "@macrostrat/color-utils";
import { AnchorButton, Button, Card, Spinner } from "@blueprintjs/core";
import type { UnitLong } from "@macrostrat/api-types";
import {
  mapboxAccessToken,
  apiV2Prefix,
  tileserverDomain,
} from "@macrostrat-web/settings";
import { Link } from "~/components";
import { PatternProvider } from "~/_providers";
import {
  fetchColumnAtPoint,
  fetchColumnByID,
  fetchIntervalsByID,
  fetchMapSource,
  fetchMapUnitAtPoint,
  roundCoordinate,
  summarizeUnits,
  type AgedFeature,
  type HeroColumn,
  type HeroPoint,
  type MapSourceRef,
  type MapUnitMatch,
} from "./hero-data";
import {
  colorForAgeRange,
  expandedTimeRange,
  intervalIDsFor,
  overlapsRange,
  sortedIntervals,
  timeRangeForSpec,
  INTERNATIONAL_TIMESCALE_ID,
  type TimeRange,
} from "./time-range";
import {
  HERO_BEARING,
  HERO_PITCH,
  type FeaturedArea,
} from "./featured-areas";
import { HeroContextBar, useFeaturedAreas } from "./hero-carousel";
import type { HeroData } from "./+data";
import type { MapSnapshotImage } from "~/map-snapshots/manifest";

/* ------------------------------------------------------------ map styling */

/** Plain imagery: no labels, no roads, no boundaries. The geology and the
 * landform are the only things to read. */
const SATELLITE_STYLE = "mapbox://styles/mapbox/satellite-v9";

/** Geology over imagery is thinner than on the map page, so the terrain the
 * units were mapped on stays visible through them. */
const GEOLOGY_FILL_OPACITY = 0.4;
const GEOLOGY_STROKE_OPACITY = 0.18;

/** With a range set, what falls inside it stays solid and everything else drops
 * to a trace. */
const HIGHLIGHT_FILL_OPACITY = 0.6;
const DIMMED_FILL_OPACITY = 0.2;

const geologyStyle = buildMacrostratStyle({
  tileserverDomain,
  fillOpacity: GEOLOGY_FILL_OPACITY,
  strokeOpacity: GEOLOGY_STROKE_OPACITY,
});

/** The elevation source terrain is drawn from, and a sky to put over it.
 *
 * This has to come from here because `setup3DTerrain` in
 * `@macrostrat/mapbox-react` never adds one: it computes
 * `demSourceID = sourceID ?? currentTerrainSourceID ?? "mapbox-dem"`, then does
 * `nextTerrainSourceID ??= addDefault3DStyles(…)` on a value that is already
 * non-null, so the fallback branch is dead. With Macrostrat's own map styles
 * that goes unnoticed — they ship a `raster-dem` source, so
 * `getTerrainSourceID` finds one — but plain `satellite-v9` has none, and
 * `map.setTerrain({source: "mapbox-dem"})` then names a source that isn't
 * there. Declaring it here gives `getTerrainSourceID` something to find.
 *
 * Deliberately no `terrain` key: whether terrain is *on* stays with
 * `MapTerrainManager`, which is what lets an overhead area be flat. */
const terrainStyle = {
  version: 8,
  sources: {
    "mapbox-dem": {
      type: "raster-dem",
      url: "mapbox://mapbox.mapbox-terrain-dem-v1",
      tileSize: 512,
      maxzoom: 14,
    },
  },
  layers: [
    {
      id: "sky",
      type: "sky",
      paint: {
        "sky-type": "atmosphere",
        "sky-atmosphere-sun": [0, 0],
        "sky-atmosphere-sun-intensity": 15,
      },
    },
  ],
};

/** Stable across renders: `MapView` rebuilds its style whenever this array's
 * identity changes. */
const overlayStyles = [terrainStyle, geologyStyle];

/** How long the map has to sit still before its centre is taken as a new
 * question to ask the API. */
const CENTER_SETTLE_MS = 400;

/* --------------------------------------------------------------- the hero */

export interface HeroLiveProps {
  hero: HeroData;
  /** The snapshot the reader was looking at, kept over the map until the map
   * has drawn itself, so taking over from the still doesn't flash. */
  still?: MapSnapshotImage | null;
}

export function HeroLive({ hero, still }: HeroLiveProps) {
  return h(
    MacrostratDataProvider,
    { baseURL: apiV2Prefix },
    h(PatternProvider, h(ErrorBoundary, h(HeroPanel, { hero, still })))
  );
}

function HeroPanel({ hero, still }: HeroLiveProps) {
  const { intervals, palette, requestIntervals } = useIntervalLookup();
  const carousel = useFeaturedAreas(hero.area);
  const state = useHeroState(
    hero,
    carousel.area,
    intervals,
    palette,
    requestIntervals
  );
  const { column, timeRange } = state;

  // Two cells: the map, with the masthead and the caption over it, and the
  // column beside it. `MapAreaContainer` used to own this, with the column as a
  // floating detail panel — which put the column on top of the map it came
  // from. A plain `MapView` in a grid gives each of them its own room.
  let columnPanel = null;
  let frameTag = "div.hero-frame.no-column";
  if (column != null) {
    columnPanel = h(
      "div.hero-column-slot",
      h(ColumnPanel, { column, onSelectUnit: state.selectUnit })
    );
    frameTag = "div.hero-frame";
  }

  let spinner = null;
  if (state.loading) {
    spinner = h("div.hero-loading", h(Spinner, { size: 20 }));
  }

  // The provider `MapAreaContainer` used to bring: `MapView` and everything
  // reading the map — the focus button, the chrome's focus state — need it.
  return h(
    MapboxMapProvider,
    h(ColumnDisplayContext.Provider, { value: state.display }, [
      h(frameTag, { key: "frame" }, [
        h("div.hero-map-slot", [
          h(HeroMap, {
            key: "map",
            area: carousel.area,
            footprint: column?.footprint ?? null,
            timeRange,
            onCenterChanged: state.setCenter,
            onProbe: state.probeAt,
          }),
          h(StillCover, { key: "still", image: still }),
          h(HeroChrome, {
            key: "chrome",
            area: carousel.area,
            center: state.center,
            zoom: state.zoom,
            timeRange,
            onClearTimeRange: state.clearTimeRange,
          }),
          spinner,
        ]),
        columnPanel,
      ]),
      h(HeroContextBar, { key: "context", carousel }),
    ])
  );
}

/** What sits over the map: the way into the full map in one corner, and what is
 * on screen — the area's name and the age range — in the other.
 *
 * One component for both because they answer the same question, "is the area
 * still what we are looking at", and `useFocusState` recomputes it on every
 * `move` event. Asking twice would double that for no gain. */
function HeroChrome({
  area,
  center,
  zoom,
  timeRange,
  onClearTimeRange,
}: {
  area: FeaturedArea;
  center: HeroPoint;
  zoom: number;
  timeRange: TimeRange | null;
  onClearTimeRange(): void;
}) {
  const focusState = useAreaFocusState(area);
  const onStory = focusState == null || isCentered(focusState);

  // The map page, at no particular place. A featured area is one of a fixed
  // list the server also knows, so a reader still on one is best sent to the
  // plain `/map` — it can be cached, and eventually prerendered. Only once they
  // have taken the map somewhere of their own is their own view worth carrying.
  let href = "/map";
  if (hasLeftArea(focusState, area, center)) {
    href = `/map/#${zoom}/${center.lat}/${center.lng}`;
  }

  // Once the reader has taken the map off the area, its name is no longer
  // describing what is on screen — so it fades out rather than being replaced
  // by a sentence about having moved.
  let titleTag = "h3.hero-title.is-hidden";
  if (onStory) titleTag = "h3.hero-title";

  return h([
    h(
      AnchorButton,
      {
        key: "explore",
        // The house purple, through the shared `pz-important-button` role: on
        // this page it is the one action being proposed.
        className: `pz-important-button ${h["hero-explore"]}`,
        href,
        icon: "map",
        large: true,
      },
      "Explore the map"
    ),
    h("div.hero-overlay", { key: "overlay" }, [
      h(titleTag, area.title),
      h(TimeRangeFilter, { timeRange, onClear: onClearTimeRange }),
    ]),
  ]);
}

/* -------------------------------------------------------------- intervals */

/** The intervals the hero reads ages with.
 *
 * The international timescale covers almost everything and is one 56 KB
 * request. Almost: supereons (the Precambrian) aren't in it, and a project on
 * its own timescale — New Zealand's stages — never is. Those are fetched by id
 * as they come up, which is a handful of records rather than the 637 KB the
 * full interval set costs. */
function useIntervalLookup() {
  const base = useMacrostratDefs("intervals", null, INTERNATIONAL_TIMESCALE_ID);
  const [extra, setExtra] = useState<Map<number, any> | null>(null);
  // Asked-for ids, so a lookup that comes back empty isn't retried forever.
  const asked = useRef<Set<number>>(new Set());

  const intervals = useMemo(() => {
    if (base == null) return extra;
    if (extra == null) return base;
    return new Map([...base, ...extra]);
  }, [base, extra]);

  const requestIntervals = useCallback(
    (ids: number[]) => {
      // Until the timescale lands we can't tell missing from not-yet-loaded.
      if (base == null) return;
      const missing = ids.filter(
        (id) => !asked.current.has(id) && intervals?.get(id) == null
      );
      if (missing.length === 0) return;
      missing.forEach((id) => asked.current.add(id));
      fetchIntervalsByID(missing).then((records) => {
        if (records.length === 0) return;
        setExtra((prev) => {
          const next = new Map(prev ?? []);
          for (const record of records) next.set(record.int_id, record);
          return next;
        });
      });
    },
    [base, intervals]
  );

  // The age palette stays on the international timescale alone. A fetched
  // extra could otherwise become the tightest interval containing a unit — a
  // New Zealand stage would — and color it off a different scheme than its
  // neighbours.
  return { intervals, palette: base, requestIntervals };
}

/* ---------------------------------------------------------- featured areas */

/** Has the reader taken the map away from the featured area, far enough that
 * their own view is worth carrying over to `/map`?
 *
 * "Away" is the area's centre no longer being in the frame, which is what
 * `useFocusState` reports as `OUT_OF_PADDING` / `OUT_OF_VIEW`. One case it
 * cannot: `getFocusState` short-circuits anything past ~45° of arc to
 * `OFF_CENTER` without projecting it, so a jump right across the globe reads as
 * a mild pan. That case is checked here instead. */
function hasLeftArea(
  focusState: PositionFocusState | null,
  area: FeaturedArea,
  center: HeroPoint
): boolean {
  if (focusState == null) return false;
  if (focusState >= PositionFocusState.OUT_OF_PADDING) return true;
  const dLat = Math.abs(center.lat - area.view.lat);
  const dLng = Math.abs((((center.lng - area.view.lng) % 360) + 540) % 360 - 180);
  return dLat > 45 || dLng > 45;
}

/** How far the area's centre has drifted from the viewport's — the
 * map-interface way of asking whether the area is still what we are looking at.
 * Null until the map is up. */
function useAreaFocusState(area: FeaturedArea) {
  const position = useMemo(
    () => [area.view.lng, area.view.lat] as [number, number],
    [area.view.lng, area.view.lat]
  );
  return useFocusState(position);
}

/* -------------------------------------------------------------- hero state */

/** What each unit box needs to draw itself, in a context so the filter can
 * change without handing the column a new `unitComponent` and remounting every
 * unit in it. */
interface ColumnDisplay {
  timeRange: TimeRange | null;
  intervals: any[] | null;
  inDarkMode: boolean;
}

const ColumnDisplayContext = createContext<ColumnDisplay>({
  timeRange: null,
  intervals: null,
  inDarkMode: false,
});

interface HeroState {
  center: HeroPoint;
  /** The map's own zoom, for the one link that carries the reader's view over
   * to `/map`. Reported on the same settle as the centre. */
  zoom: number;
  column: HeroColumn | null;
  loading: boolean;
  timeRange: TimeRange | null;
  mapUnit: MapUnitMatch | null;
  mapSource: MapSourceRef | null;
  display: ColumnDisplay;
  setCenter(lat: number, lng: number, zoom: number, userInitiated: boolean): void;
  /** A click on the map: ask what is there, and filter by it. */
  probeAt(lat: number, lng: number): void;
  selectUnit(unitID: number | null, unit: UnitLong | null): void;
  clearTimeRange(): void;
}

/** Everything the hero's pieces share. Seeded from the server-rendered hero, so
 * the first paint needs no request — unless the browser opened on a different
 * area than the server did, which is what a "near you" area does. */
function useHeroState(
  hero: HeroData,
  area: FeaturedArea,
  intervals: Map<number, any> | null,
  palette: Map<number, any> | null,
  requestIntervals: (ids: number[]) => void
): HeroState {
  const [center, setCenterState] = useState<HeroPoint>(area.view);
  const [zoom, setZoom] = useState<number>(area.view.zoom);
  const [column, setColumn] = useState<HeroColumn | null>(() => {
    if (area.id !== hero.area.id) return null;
    return hero.column;
  });
  const [loading, setLoading] = useState(false);
  const [mapUnit, setMapUnit] = useState<MapUnitMatch | null>(null);
  const [mapSource, setMapSource] = useState<MapSourceRef | null>(null);

  // The filter is stored as what was *chosen*, not as a resolved range: a
  // clicked feature, or the area's own spec. The range is derived, so an
  // interval that arrives late — from the timescale, or from a lookup by id —
  // corrects the chip instead of leaving the zeroes it was built with.
  const [selection, setSelection] = useState<AgedFeature | null>(null);
  const [areaSpec, setAreaSpec] = useState<FeaturedArea["ageRange"] | null>(
    area.ageRange ?? null
  );

  const timeRange = useMemo(() => {
    if (selection != null) return expandedTimeRange(selection, intervals);
    return timeRangeForSpec(areaSpec, intervals);
  }, [selection, areaSpec, intervals]);

  // Whatever was selected may name intervals the timescale doesn't carry.
  useEffect(() => {
    requestIntervals(intervalIDsFor(selection));
  }, [selection, requestIntervals]);

  // The column an area pinned, until the reader pans away from it.
  const [pinnedColumn, setPinnedColumn] = useState<number | null>(
    area.columnID ?? null
  );

  // Where to ask what the geology is, and whether the answer should set the
  // filter. The centre asks for the credit line only; a click asks to filter.
  const [probe, setProbe] = useState<HeroPoint & { filter: boolean }>({
    lat: area.view.lat,
    lng: area.view.lng,
    filter: false,
  });

  const setCenter = useCallback(
    (lat: number, lng: number, nextZoom: number, userInitiated: boolean) => {
      const next = { lat: roundCoordinate(lat), lng: roundCoordinate(lng) };
      setCenterState(next);
      setZoom(Math.round(nextZoom * 10) / 10);
      setProbe({ ...next, filter: false });
      // Panning is how you leave a featured area's column behind.
      if (userInitiated) setPinnedColumn(null);
    },
    []
  );

  const probeAt = useCallback((lat: number, lng: number) => {
    setProbe({
      lat: roundCoordinate(lat),
      lng: roundCoordinate(lng),
      filter: true,
    });
  }, []);

  const onMapUnitResolved = useCallback(
    (match: MapUnitMatch | null, shouldFilter: boolean) => {
      setMapUnit(match);
      if (!shouldFilter || match == null) return;
      setSelection(match);
    },
    []
  );

  useAreaSelection(area, {
    setPinnedColumn,
    setSelection,
    setAreaSpec,
    setCenterState,
    setZoom,
    setProbe,
  });
  useHeroColumn(area, pinnedColumn, center, hero, setColumn, setLoading);
  useMapUnitAtPoint(probe, onMapUnitResolved, setMapSource);

  const selectUnit = useCallback(
    (_unitID: number | null, unit: UnitLong | null) => {
      // A null selection is not a request to clear the filter. The column fires
      // one whenever it swaps in a different column's units, and losing the age
      // filter every time the map settles somewhere new is not what anyone
      // means by panning. The clear button is the only way out.
      if (unit == null) return;
      setSelection(unit as AgedFeature);
    },
    []
  );

  const clearTimeRange = useCallback(() => {
    setSelection(null);
    setAreaSpec(null);
  }, []);

  const ranked = useMemo(() => sortedIntervals(palette), [palette]);
  // Read once here rather than in each of the column's several dozen unit
  // boxes, which all need it to pick their fill.
  const inDarkMode = useInDarkMode();
  const display = useMemo(
    () => ({ timeRange, intervals: ranked, inDarkMode }),
    [timeRange, ranked, inDarkMode]
  );

  return {
    center,
    zoom,
    column,
    loading,
    timeRange,
    mapUnit,
    mapSource,
    display,
    setCenter,
    probeAt,
    selectUnit,
    clearTimeRange,
  };
}

interface AreaSetters {
  setPinnedColumn(id: number | null): void;
  setSelection(f: AgedFeature | null): void;
  setAreaSpec(spec: FeaturedArea["ageRange"] | null): void;
  setCenterState(p: HeroPoint): void;
  setZoom(z: number): void;
  setProbe(p: HeroPoint & { filter: boolean }): void;
}

/** What choosing an area sets: its pinned column, its age range, and — when it
 * pins no column — the centre, so the column is looked up where the area is
 * about to land rather than where the map still is. */
function useAreaSelection(area: FeaturedArea, setters: AreaSetters) {
  const {
    setPinnedColumn,
    setSelection,
    setAreaSpec,
    setCenterState,
    setZoom,
    setProbe,
  } = setters;

  useEffect(() => {
    setPinnedColumn(area.columnID ?? null);
    // A new area is a new story: whatever was clicked in the last one goes.
    setSelection(null);
    setAreaSpec(area.ageRange ?? null);
    setZoom(area.view.zoom);
    if (area.columnID != null) return;
    const next = {
      lat: roundCoordinate(area.view.lat),
      lng: roundCoordinate(area.view.lng),
    };
    setCenterState(next);
    setProbe({ ...next, filter: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the area
  }, [area.id]);
}

/** The hero's column: the one the area pinned, or the one under the map's
 * centre once the reader has panned away. Keyed by point in the second case,
 * which is a stopgap — see the "Column spatial queries" feature area. */
function useHeroColumn(
  area: FeaturedArea,
  pinnedColumn: number | null,
  center: HeroPoint,
  hero: HeroData,
  setColumn: (c: HeroColumn | null) => void,
  setLoading: (b: boolean) => void
) {
  const requestID = useRef(0);
  // The server already answered for the area it opened on; don't ask again.
  const seeded = useRef(area.id === hero.area.id && hero.column != null);

  useEffect(() => {
    if (seeded.current) {
      seeded.current = false;
      return;
    }
    const id = ++requestID.current;
    let cancelled = false;
    setLoading(true);

    let request: Promise<HeroColumn | null>;
    if (pinnedColumn != null) {
      request = fetchColumnByID(pinnedColumn);
    } else {
      request = fetchColumnAtPoint(center.lat, center.lng);
    }

    request.then((result) => {
      if (cancelled || id !== requestID.current) return;
      setLoading(false);
      setColumn(result);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the source
  }, [pinnedColumn, center.lat, center.lng]);
}

/** Asks what geologic map unit is at the probe point, and who published the map
 * it came from. Runs for the opening centre too, so the credit line is there
 * before anything is clicked. */
function useMapUnitAtPoint(
  probe: HeroPoint & { filter: boolean },
  onResolved: (m: MapUnitMatch | null, shouldFilter: boolean) => void,
  setMapSource: (s: MapSourceRef | null) => void
) {
  useEffect(() => {
    let cancelled = false;
    const shouldFilter = probe.filter;
    fetchMapUnitAtPoint(probe.lat, probe.lng).then(async (match) => {
      if (cancelled) return;
      onResolved(match, shouldFilter);
      if (match == null) {
        setMapSource(null);
        return;
      }
      const source = await fetchMapSource(match.source_id);
      if (cancelled) return;
      setMapSource(source);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the probe
  }, [probe]);
}

/* ----------------------------------------------------------------- the map */

interface HeroMapProps {
  area: FeaturedArea;
  footprint: GeoJSON.Feature | null;
  timeRange: TimeRange | null;
  onCenterChanged?(
    lat: number,
    lng: number,
    zoom: number,
    userInitiated: boolean
  ): void;
  onProbe?(lat: number, lng: number): void;
  /** Drawn for the snapshot route: static, readable back from its canvas, and
   * with nothing that listens for a reader. Attribution and the wordmark are
   * HTML, not canvas, so the page showing the snapshot draws its own. */
  snapshot?: boolean;
}

/** Marks a camera move as the hero's own, so the centre reporter can tell a
 * carousel flight from the reader dragging the map. Mapbox passes this through
 * to the events the move raises. */
const HERO_MOVE = { heroTransition: true };

export function HeroMap({
  area,
  footprint,
  timeRange,
  onCenterChanged,
  onProbe,
  snapshot = false,
}: HeroMapProps) {
  // The opening camera, read once: `AreaFlight` drives every later change.
  const initialView = useRef(area.view);
  const onMapLoaded = useCallback((map) => {
    const view = initialView.current;
    setMapPosition(map, { lat: view.lat, lng: view.lng, zoom: view.zoom });
    map.setPitch(view.pitch ?? HERO_PITCH);
    map.setBearing(view.bearing ?? HERO_BEARING);
    if (snapshot) return;
    // Attribution as the compact ⓘ rather than a line of credits across the
    // corner. Mapbox's constructor has no option for it, so the default one is
    // switched off below and the compact one added here.
    map.addControl(
      new mapboxgl.AttributionControl({ compact: true }),
      "bottom-right"
    );
  }, []);

  let children = [
    h(AreaFlight, { key: "flight", area }),
    h(ColumnFootprintLayer, { key: "footprint", footprint }),
    h(TimeRangeHighlight, { key: "highlight", timeRange }),
    h(CenterReporter, { key: "centre", onChange: onCenterChanged }),
    h(MapProbeHandler, { key: "probe", onProbe }),
    h(ScrollZoomGate, { key: "scroll-zoom" }),
  ];
  let snapshotOptions = {};
  if (snapshot) {
    // What the picture shows — the camera, the footprint, the filter — and
    // none of the listeners that wait for a reader.
    children = children.slice(0, 3);
    snapshotOptions = {
      interactive: false,
      // The canvas is read back after it has been composited.
      preserveDrawingBuffer: true,
      // Symbols appear at once rather than fading in over the capture.
      fadeDuration: 0,
    };
  }

  // Standalone: with no `MapAreaContainer` around it the map is no longer
  // full-bleed behind panels, it is one cell of the hero's grid, and standalone
  // is what makes `.map-view-container` fill the box it is given.
  return h(
    MapView,
    {
      style: SATELLITE_STYLE,
      accessToken: mapboxAccessToken,
      standalone: true,
      // Both pass straight through `MapView` to the Mapbox constructor. The
      // default attribution line is replaced with the compact control in
      // `onMapLoaded`; the wordmark joins it on the right, because the map's
      // bottom-left corner is the caption's.
      attributionControl: false,
      logoPosition: "bottom-right",
      overlayStyles,
      // An overhead area has nothing to gain from terrain, and Mapbox only
      // turns it on below ~200 km of camera altitude anyway.
      enableTerrain: (area.view.pitch ?? HERO_PITCH) > 0,
      pitch: area.view.pitch ?? HERO_PITCH,
      bearing: area.view.bearing ?? HERO_BEARING,
      onMapLoaded,
      ...snapshotOptions,
    },
    children
  );
}

/** The snapshot the reader was looking at, left over the live map until the
 * map is first idle — style, imagery and terrain all drawn — and then faded
 * out. The two are registered: the snapshot is drawn from the same camera at
 * the same scale, and shown unscaled from its centre. */
function StillCover({ image }: { image: MapSnapshotImage | null | undefined }) {
  const mapRef = useMapRef();
  const initialized = useMapInitialized();
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const map = mapRef.current;
    if (map == null || image == null) return;
    const reveal = () => setDrawn(true);
    map.once("idle", reveal);
    return () => {
      map.off("idle", reveal);
    };
  }, [initialized, image]);

  if (image == null) return null;
  let tag = "img.hero-still-cover";
  if (drawn) tag = "img.hero-still-cover.is-revealed";
  return h(tag, {
    src: image.src,
    srcSet: image.srcSet,
    alt: "",
    "aria-hidden": true,
  });
}

/** Scroll-zoom stays off until the map has been clicked once.
 *
 * A live map across a landing page otherwise swallows the scroll that was meant
 * for the page: the reader flicks the wheel to read on, and zooms instead. One
 * click says the map is what they came for, and from then on it behaves like
 * any other map. Dragging and the keyboard are untouched — neither competes
 * with the page's own scrolling. */
function ScrollZoomGate() {
  const mapRef = useMapRef();
  const initialized = useMapInitialized();

  useEffect(() => {
    const map = mapRef.current;
    if (map == null) return;
    map.scrollZoom.disable();
    const enable = () => map.scrollZoom.enable();
    map.on("click", enable);
    return () => {
      map.off("click", enable);
    };
  }, [initialized]);

  return null;
}

/** Flies the map to the chosen area. Skips the first run: the map was built
 * with that camera, and flying from it to itself is a wasted animation. */
function AreaFlight({ area }: { area: FeaturedArea }) {
  const mapRef = useMapRef();
  const initialized = useMapInitialized();
  const lastArea = useRef<string | null>(area.id);

  useEffect(() => {
    const map = mapRef.current;
    if (map == null) return;
    if (lastArea.current === area.id) return;
    lastArea.current = area.id;
    const { lat, lng, zoom, pitch, bearing } = area.view;
    map.flyTo(
      {
        center: [lng, lat],
        zoom,
        pitch: pitch ?? HERO_PITCH,
        bearing: bearing ?? HERO_BEARING,
        duration: 2600,
        essential: true,
      },
      HERO_MOVE
    );
  }, [area.id, initialized]);

  return null;
}

/** A click anywhere on the map asks what is beneath it. There is no marker: the
 * answer shows up as the filter, not as a pin.
 *
 * Bound directly rather than through `useMapClickHandler`, which registers the
 * listener inside `useMapStyleOperator` — and that hook discards the cleanup
 * its operator returns, so the handler is added again on every style reload and
 * one click ends up firing several lookups. */
function MapProbeHandler({
  onProbe,
}: {
  onProbe(lat: number, lng: number): void;
}) {
  const mapRef = useMapRef();
  const initialized = useMapInitialized();

  useEffect(() => {
    const map = mapRef.current;
    if (map == null) return;
    const handle = (event) => {
      onProbe(event.lngLat.lat, event.lngLat.lng);
    };
    map.on("click", handle);
    return () => {
      map.off("click", handle);
    };
  }, [initialized, onProbe]);

  return null;
}

/** Publishes the map's centre once it settles, which is what picks the column
 * outside a featured area — and says whether the reader moved it, which is what
 * releases a featured area's pinned column. */
function CenterReporter({
  onChange,
}: {
  onChange(lat: number, lng: number, zoom: number, userInitiated: boolean): void;
}) {
  const mapRef = useMapRef();
  const initialized = useMapInitialized();

  useEffect(() => {
    const map = mapRef.current;
    if (map == null) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const report = (event: any) => {
      const userInitiated = event?.heroTransition !== true;
      if (timer != null) clearTimeout(timer);
      timer = setTimeout(() => {
        const c = map.getCenter();
        onChange(c.lat, c.lng, map.getZoom(), userInitiated);
      }, CENTER_SETTLE_MS);
    };
    map.on("moveend", report);
    return () => {
      if (timer != null) clearTimeout(timer);
      map.off("moveend", report);
    };
  }, [initialized, onChange]);

  return null;
}

/** The current column's own outline — the one footprint worth drawing now that
 * the whole-dataset layer is gone. */
function ColumnFootprintLayer({
  footprint,
}: {
  footprint: GeoJSON.Feature | null;
}) {
  useOverlayStyle(() => columnFootprintStyle, []);
  useMapStyleOperator(
    (map) => {
      if (map.getSource("hero-column") == null) return;
      setGeoJSON(map, "hero-column", {
        type: "FeatureCollection",
        features: footprint == null ? [] : [footprint],
      });
    },
    [footprint]
  );
  return null;
}

/** Map paint sits over satellite imagery rather than over a themed surface, so
 * it can't read the design-system tokens — a Mapbox paint value is not CSS.
 * Named here so the one place to change it is obvious. */
const FOOTPRINT_LINE_COLOR = "rgba(255, 255, 255, 0.8)";

const columnFootprintStyle = {
  version: 8,
  sources: {
    "hero-column": {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    },
  },
  layers: [
    {
      id: "hero-column-outline",
      type: "line",
      source: "hero-column",
      paint: {
        "line-color": FOOTPRINT_LINE_COLOR,
        "line-width": 1.5,
        "line-dasharray": [3, 2],
      },
    },
  ],
};

/** With a range set, geologic map units whose age overlaps it keep their color
 * and everything else fades into the imagery. */
function TimeRangeHighlight({ timeRange }: { timeRange: TimeRange | null }) {
  useMapStyleOperator(
    (map) => {
      if (map.getLayer("burwell_fill") == null) return;
      if (timeRange == null) {
        map.setPaintProperty(
          "burwell_fill",
          "fill-opacity",
          GEOLOGY_FILL_OPACITY
        );
        map.setPaintProperty(
          "burwell_stroke",
          "line-opacity",
          GEOLOGY_STROKE_OPACITY
        );
        return;
      }
      const overlaps = ageOverlapExpression(timeRange);
      map.setPaintProperty("burwell_fill", "fill-opacity", [
        "case",
        overlaps,
        HIGHLIGHT_FILL_OPACITY,
        DIMMED_FILL_OPACITY,
      ]);
      map.setPaintProperty("burwell_stroke", "line-opacity", [
        "case",
        overlaps,
        0.9,
        0,
      ]);
    },
    [timeRange]
  );
  return null;
}

/** Map polygons are dated by the legend's best age range. `to-number` covers
 * polygons with no age at all — they compare as 0 and fall out. */
function ageOverlapExpression(range: TimeRange) {
  return [
    "all",
    ["<", ["to-number", ["get", "best_age_top"]], range.b_age],
    [">", ["to-number", ["get", "best_age_bottom"]], range.t_age],
  ];
}

/* ------------------------------------------------------------- the column */

/** The inset's width in pixels. The column is drawn exactly this wide and the
 * box has no padding, so the units run edge to edge: the box *is* the column. */
const COLUMN_WIDTH = 204;

/** For a unit with neither an age color nor one of its own. A literal rather
 * than a token because it is handed to chroma and then to an SVG fill, neither
 * of which resolves a CSS variable. */
const FALLBACK_UNIT_COLOR = "#c5cbd3";

function ColumnPanel({
  column,
  onSelectUnit,
}: {
  column: HeroColumn;
  onSelectUnit(unitID: number | null, unit: UnitLong | null): void;
}) {
  const { info, units, footprint } = column;
  const stats = useMemo(() => summarizeUnits(units), [units]);
  const bounds = useMemo(
    () => boundsForGeometry(footprint?.geometry),
    [footprint]
  );

  let focusButton = null;
  if (bounds != null) {
    // The library's own focus control: it knows whether the target is already
    // on screen, and fits the map to it when it isn't.
    focusButton = h(LocationFocusButton, {
      className: "column-focus-button",
      bounds,
      small: true,
      title: `Zoom to ${info.col_name}`,
    });
  }

  return h(Card, { className: h["hero-column-panel"] }, [
    h("div.column-inset-header", [
      h("div.column-inset-titles", [
        h(
          Link,
          { href: `/columns/${info.col_id}`, className: "col-name" },
          info.col_name
        ),
        h(
          "p.column-inset-summary",
          `${stats.n_units} units · ${formatAge(stats.b_age)}`
        ),
      ]),
      focusButton,
    ]),
    h(
      "div.column-inset-scroll",
      h(Column, {
        units,
        unitComponent: HeroUnit,
        ageAxisComponent: NoAxis,
        axisType: ColumnAxisType.AGE,
        // Every unit gets the same room whatever its duration, so a thin
        // member is as readable as a kilometre of basement.
        hybridScale: { type: HybridScaleType.EquidistantSurfaces },
        // On that scale this is the spacing between surfaces: tall enough for
        // a line of text.
        targetUnitHeight: 30,
        // A gap in the record is worth marking, not worth a band of its own.
        unconformityHeight: 8,
        showTimescale: false,
        showLabels: true,
        showLabelColumn: false,
        allowUnitSelection: true,
        onUnitSelected: onSelectUnit,
        unconformityLabels: "none",
        collapseSmallUnconformities: true,
        padding: 0,
        width: COLUMN_WIDTH,
        columnWidth: COLUMN_WIDTH,
      })
    ),
  ]);
}

/** The bounding box of a footprint, as `LocationFocusButton` wants it. */
function boundsForGeometry(
  geometry: any
): [number, number, number, number] | null {
  if (geometry == null) return null;
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  const visit = (coords: any) => {
    if (typeof coords[0] === "number") {
      const [lng, lat] = coords;
      if (lng < minLng) minLng = lng;
      if (lat < minLat) minLat = lat;
      if (lng > maxLng) maxLng = lng;
      if (lat > maxLat) maxLat = lat;
      return;
    }
    for (const part of coords) visit(part);
  };
  visit(geometry.coordinates);

  if (!Number.isFinite(minLng)) return null;
  // A point footprint — a drill site — has no extent to fit; give it one.
  if (minLng === maxLng && minLat === maxLat) {
    const pad = 0.25;
    return [minLng - pad, minLat - pad, maxLng + pad, maxLat + pad];
  }
  return [minLng, minLat, maxLng, maxLat];
}

/** Replaces the composite age axis: the inset has no room for one, and the
 * equidistant-surfaces scale makes its ticks misleading anyway. */
function NoAxis() {
  return null;
}

/** The two ends of the age filter's contrast. It reads from both directions:
 * what is in range gains a little saturation, and what is out of it only
 * washes back — far enough to recede, not so far that the column stops being a
 * column. */
const SELECTED_UNIT_SATURATION = 0.8;
const DIMMED_UNIT_ALPHA = 0.45;

/** A unit box colored by its age, adapted to the theme, and washed out when it
 * falls outside the selected range.
 *
 * The wash is applied to the **color itself**, not through a class. Only the
 * background is meant to back off — the lithology pattern, the outline and the
 * label all stay at full strength — and a class here would be worse than
 * useless: `LabeledUnit` spreads the props it doesn't recognise over its own
 * `className`, so passing one *replaces* `labeled-unit` and takes the unit's
 * background fill and label styling with it. */
function HeroUnit(props) {
  const { timeRange, intervals, inDarkMode } = useContext(ColumnDisplayContext);
  const { division } = props;

  const ageColor = useMemo(
    () => colorForAgeRange(division.t_age, division.b_age, intervals),
    [division.t_age, division.b_age, intervals]
  );

  const inRange =
    timeRange == null ||
    overlapsRange(timeRange, division.t_age, division.b_age);

  const backgroundColor = useMemo(() => {
    const base = ageColor ?? division.color ?? FALLBACK_UNIT_COLOR;
    const adjusted = asUnitBackground(base, inDarkMode);
    // Nothing selected: every unit at its own strength.
    if (timeRange == null || inRange) return adjusted;
    if (inRange) return saturateColor(adjusted);
    return "var(--column-background-color)";
  }, [ageColor, division.color, timeRange, inRange, inDarkMode]);

  // Hack to use a simpler fill without text shadow
  return h(UnitComponent, { ...props, backgroundColor });
}

/** A unit fill for the current theme: the same treatment `IntervalTag` gives a
 * chip, through the same helper, so an interval reads as the same color in the
 * column and in the filter above it. Chart colors are published for paper — a
 * pale Cretaceous green glows on a dark panel — and `getLuminanceAdjustedColorScheme`
 * keeps the hue while putting the lightness where the theme wants it. */
function asUnitBackground(color: string, inDarkMode: boolean): string {
  // Guarded: the helper reads `bkg.css()` without a null check, so a color it
  // can't parse throws rather than falling back.
  if (asChromaColor(color) == null) return color;
  const scheme = getLuminanceAdjustedColorScheme(color, inDarkMode);
  return scheme?.backgroundColor ?? color;
}

/** A unit inside the filter, lifted. Chroma saturates in LCH, so this stays at
 * the same lightness the theme put it at. */
function saturateColor(color: string): string {
  const c = asChromaColor(color);
  if (c == null) return color;
  return c.saturate(SELECTED_UNIT_SATURATION).hex();
}

/* ------------------------------------------------- filter and credits */

function TimeRangeFilter({
  timeRange,
  onClear,
}: {
  timeRange: TimeRange | null;
  onClear(): void;
}) {
  // Nothing filtered, nothing to say: the hint that used to stand in its place
  // was one more line of text over the map.
  if (timeRange == null || timeRange.intervals.length === 0) return null;

  return h("div.hero-filter", [
    h(IntervalField, { intervals: timeRange.intervals, showAgeRange: true }),
    h(Button, {
      minimal: true,
      small: true,
      icon: "cross",
      title: "Clear the age filter",
      onClick: onClear,
    }),
  ]);
}

/** Who made what the hero is showing. Stays below the frame: it is a credit
 * line, not a control, and the panels inside the map are for controls. */
function HeroCredits({
  column,
  mapSource,
}: {
  column: HeroColumn | null;
  mapSource: MapSourceRef | null;
}) {
  let columnCredit = null;
  if (column != null) {
    columnCredit = h("p.hero-credit", [
      h("span.credit-label", "Column"),
      h(Link, { href: `/columns/${column.info.col_id}` }, column.info.col_name),
      h.if(column.info.col_group != null)("span.credit-detail", [
        ` · ${column.info.col_group}`,
      ]),
    ]);
  }

  let mapCredit = null;
  if (mapSource != null) {
    mapCredit = h("p.hero-credit", [
      h("span.credit-label", "Geologic map"),
      h(MapSourceCitation, { source: mapSource }),
    ]);
  }

  if (columnCredit == null && mapCredit == null) return null;

  return h("div.hero-credits", [columnCredit, mapCredit]);
}

function MapSourceCitation({ source }: { source: MapSourceRef }) {
  const title = source.ref_title ?? source.name;
  let label: any = title;
  if (source.url != null) {
    label = h(
      "a",
      { href: source.url, target: "_blank", rel: "noreferrer" },
      title
    );
  }

  let attribution = null;
  if (source.authors != null) {
    let year = "";
    if (source.ref_year != null) year = `, ${source.ref_year}`;
    attribution = h("span.credit-detail", ` · ${source.authors}${year}`);
  }

  return h("span", [label, attribution]);
}

function formatAge(ma: number): string {
  if (ma >= 1000) return `${(ma / 1000).toFixed(1)} Gyr of record`;
  return `${Math.round(ma)} Myr of record`;
}
