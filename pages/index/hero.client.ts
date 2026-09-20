/** The live homepage hero: a pitched, terrain-lit satellite map with
 * Macrostrat's geology over it, and the stratigraphic column beneath the map's
 * centre in a box over it — a box with no padding anywhere, so it reads as the
 * column itself rather than a panel containing one.
 *
 * Client-only (mapbox-gl); `+Page.ts` shows the cover photo until this mounts.
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
import { setGeoJSON, setMapPosition } from "@macrostrat/mapbox-utils";
import {
  MapboxMapProvider,
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
import { ErrorBoundary } from "@macrostrat/ui-components";
import { asChromaColor, toRGBAString } from "@macrostrat/color-utils";
import { Button, Spinner } from "@blueprintjs/core";
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
  areaByID,
  featuredAreas,
  nearbyArea,
  type FeaturedArea,
} from "./featured-areas";
import type { HeroData } from "./+data";

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
const HIGHLIGHT_FILL_OPACITY = 0.85;
const DIMMED_FILL_OPACITY = 0.05;

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

export function HeroLive({ hero }: { hero: HeroData }) {
  return h(
    MacrostratDataProvider,
    { baseURL: apiV2Prefix },
    h(PatternProvider, h(ErrorBoundary, h(HeroPanel, { hero })))
  );
}

function HeroPanel({ hero }: { hero: HeroData }) {
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

  let inset = null;
  if (column != null) {
    inset = h(ColumnInset, { column, onSelectUnit: state.selectUnit });
  }

  let spinner = null;
  if (state.loading) {
    spinner = h("div.hero-loading", h(Spinner, { size: 20 }));
  }

  return h(ColumnDisplayContext.Provider, { value: state.display }, [
    h("div.hero-frame", { key: "frame" }, [
      h(
        MapboxMapProvider,
        h(HeroMap, {
          area: carousel.area,
          footprint: column?.footprint ?? null,
          timeRange,
          onCenterChanged: state.setCenter,
          onProbe: state.probeAt,
        })
      ),
      inset,
      spinner,
      h(AreaCarousel, { key: "carousel", ...carousel }),
    ]),
    h(HeroContext, {
      key: "context",
      column,
      timeRange,
      mapUnit: state.mapUnit,
      mapSource: state.mapSource,
      center: state.center,
      area: carousel.area,
      onClearTimeRange: state.clearTimeRange,
    }),
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
  const base = useMacrostratDefs(
    "intervals",
    null,
    INTERNATIONAL_TIMESCALE_ID
  );
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

interface Carousel {
  areas: FeaturedArea[];
  area: FeaturedArea;
  index: number;
  go(index: number): void;
}

/** The areas on offer and which one is showing.
 *
 * The reader's own region goes first when we have an estimate of it, and is
 * chosen on arrival — resolved in the initial state rather than an effect, so
 * the map opens there instead of flying there a moment later. */
function useFeaturedAreas(serverArea: FeaturedArea): Carousel {
  const areas = useMemo(() => {
    const nearby = nearbyArea();
    if (nearby == null) return featuredAreas;
    return [nearby, ...featuredAreas];
  }, []);

  const [index, setIndex] = useState(() => {
    if (areas[0]?.id === "near-you") return 0;
    const i = areas.findIndex((a) => a.id === serverArea.id);
    return i < 0 ? 0 : i;
  });

  const go = useCallback(
    (next: number) => {
      const count = areas.length;
      setIndex(((next % count) + count) % count);
    },
    [areas.length]
  );

  return { areas, area: areas[index], index, go };
}

function dotButton(
  item: FeaturedArea,
  i: number,
  index: number,
  go: (n: number) => void
) {
  let className = undefined;
  if (i === index) className = "active";
  return h("button.caption-dot", {
    key: item.id,
    className,
    title: item.title,
    "aria-label": item.title,
    onClick: () => go(i),
  });
}

/** The story card over the map: what this area is, and the way through the
 * others. */
function AreaCarousel({ areas, area, index, go }: Carousel) {
  if (areas.length === 0) return null;

  let nav = null;
  if (areas.length > 1) {
    nav = h("div.caption-nav", [
      h(Button, {
        minimal: true,
        small: true,
        icon: "chevron-left",
        title: "Previous area",
        onClick: () => go(index - 1),
      }),
      h(
        "div.caption-dots",
        areas.map((item, i) =>
          dotButton(item, i, index, go)
        )
      ),
      h(Button, {
        minimal: true,
        small: true,
        icon: "chevron-right",
        title: "Next area",
        onClick: () => go(index + 1),
      }),
    ]);
  }

  return h("div.hero-caption", [
    // Keyed on the area so the card re-enters, which is what the transition in
    // the stylesheet animates.
    h("div.caption-body", { key: area.id }, [
      h("h3.caption-title", area.title),
      h("p.caption-text", area.description),
    ]),
    nav,
  ]);
}

/* -------------------------------------------------------------- hero state */

/** What each unit box needs to draw itself, in a context so the filter can
 * change without handing the column a new `unitComponent` and remounting every
 * unit in it. */
interface ColumnDisplay {
  timeRange: TimeRange | null;
  intervals: any[] | null;
}

const ColumnDisplayContext = createContext<ColumnDisplay>({
  timeRange: null,
  intervals: null,
});

interface HeroState {
  center: HeroPoint;
  column: HeroColumn | null;
  loading: boolean;
  timeRange: TimeRange | null;
  mapUnit: MapUnitMatch | null;
  mapSource: MapSourceRef | null;
  display: ColumnDisplay;
  setCenter(lat: number, lng: number, userInitiated: boolean): void;
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
    (lat: number, lng: number, userInitiated: boolean) => {
      const next = { lat: roundCoordinate(lat), lng: roundCoordinate(lng) };
      setCenterState(next);
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
  const display = useMemo(
    () => ({ timeRange, intervals: ranked }),
    [timeRange, ranked]
  );

  return {
    center,
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
  setProbe(p: HeroPoint & { filter: boolean }): void;
}

/** What choosing an area sets: its pinned column, its age range, and — when it
 * pins no column — the centre, so the column is looked up where the area is
 * about to land rather than where the map still is. */
function useAreaSelection(area: FeaturedArea, setters: AreaSetters) {
  const { setPinnedColumn, setSelection, setAreaSpec, setCenterState, setProbe } =
    setters;

  useEffect(() => {
    setPinnedColumn(area.columnID ?? null);
    // A new area is a new story: whatever was clicked in the last one goes.
    setSelection(null);
    setAreaSpec(area.ageRange ?? null);
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
  onCenterChanged(lat: number, lng: number, userInitiated: boolean): void;
  onProbe(lat: number, lng: number): void;
}

/** Marks a camera move as the hero's own, so the centre reporter can tell a
 * carousel flight from the reader dragging the map. Mapbox passes this through
 * to the events the move raises. */
const HERO_MOVE = { heroTransition: true };

function HeroMap({
  area,
  footprint,
  timeRange,
  onCenterChanged,
  onProbe,
}: HeroMapProps) {
  // The opening camera, read once: `AreaFlight` drives every later change.
  const initialView = useRef(area.view);
  const onMapLoaded = useCallback((map) => {
    const view = initialView.current;
    setMapPosition(map, { lat: view.lat, lng: view.lng, zoom: view.zoom });
    map.setPitch(view.pitch ?? HERO_PITCH);
    map.setBearing(view.bearing ?? HERO_BEARING);
  }, []);

  return h("div.hero-map", [
    h(
      MapView,
      {
        style: SATELLITE_STYLE,
        accessToken: mapboxAccessToken,
        standalone: true,
        overlayStyles,
        // An overhead area has nothing to gain from terrain, and Mapbox only
        // turns it on below ~200 km of camera altitude anyway.
        enableTerrain: (area.view.pitch ?? HERO_PITCH) > 0,
        pitch: area.view.pitch ?? HERO_PITCH,
        bearing: area.view.bearing ?? HERO_BEARING,
        onMapLoaded,
      },
      [
        h(AreaFlight, { key: "flight", area }),
        h(ColumnFootprintLayer, { key: "footprint", footprint }),
        h(TimeRangeHighlight, { key: "highlight", timeRange }),
        h(CenterReporter, { key: "centre", onChange: onCenterChanged }),
        h(MapProbeHandler, { key: "probe", onProbe }),
      ]
    ),
  ]);
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
  onChange(lat: number, lng: number, userInitiated: boolean): void;
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
        onChange(c.lat, c.lng, userInitiated);
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
        "line-color": "rgba(255, 255, 255, 0.8)",
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
const COLUMN_WIDTH = 210;

/** For a unit with neither an age color nor one of its own. */
const FALLBACK_UNIT_COLOR = "#c5cbd3";

function ColumnInset({
  column,
  onSelectUnit,
}: {
  column: HeroColumn;
  onSelectUnit(unitID: number | null, unit: UnitLong | null): void;
}) {
  const { info, units } = column;
  const stats = useMemo(() => summarizeUnits(units), [units]);

  return h("div.column-inset", [
    h("div.column-inset-header", [
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

/** Replaces the composite age axis: the inset has no room for one, and the
 * equidistant-surfaces scale makes its ticks misleading anyway. */
function NoAxis() {
  return null;
}

/** How much of its color a unit outside the age filter keeps. */
const DIMMED_UNIT_ALPHA = 0.15;

/** A unit box colored by its age rather than its lithology, washed out when it
 * falls outside the selected range.
 *
 * The wash is applied to the **color itself**, not through a class. Only the
 * background is meant to back off — the lithology pattern, the outline and the
 * label all stay at full strength — and a class here would be worse than
 * useless: `LabeledUnit` spreads the props it doesn't recognise over its own
 * `className`, so passing one *replaces* `labeled-unit` and takes the unit's
 * background fill and label styling with it. */
function HeroUnit(props) {
  const { timeRange, intervals } = useContext(ColumnDisplayContext);
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
    if (inRange) return base;
    return fadeColor(base);
  }, [ageColor, division.color, inRange]);

  // No `fill`: leaving it off is what puts the FGDC lithology pattern back on
  // the unit. `Unit` fills its background rect with `backgroundColor` — the age
  // — and its foreground rect with the pattern, so the unit says both.
  return h(UnitComponent, { ...props, backgroundColor });
}

function fadeColor(color: string): string {
  const c = asChromaColor(color);
  if (c == null) return color;
  return toRGBAString(c.alpha(DIMMED_UNIT_ALPHA));
}

/* -------------------------------------------------- filter and credits */

interface HeroContextProps {
  column: HeroColumn | null;
  timeRange: TimeRange | null;
  mapUnit: MapUnitMatch | null;
  mapSource: MapSourceRef | null;
  center: HeroPoint;
  area: FeaturedArea;
  onClearTimeRange(): void;
}

/** Under the hero: what the view is filtered to, and where its data came from. */
function HeroContext({
  column,
  timeRange,
  mapUnit,
  mapSource,
  center,
  area,
  onClearTimeRange,
}: HeroContextProps) {
  return h("div.hero-context", [
    h(TimeRangeFilter, { timeRange, mapUnit, onClear: onClearTimeRange }),
    h(HeroCredits, { column, mapSource, center, area }),
  ]);
}

function TimeRangeFilter({
  timeRange,
  mapUnit,
  onClear,
}: {
  timeRange: TimeRange | null;
  mapUnit: MapUnitMatch | null;
  onClear(): void;
}) {
  if (timeRange == null || timeRange.intervals.length === 0) {
    let hint = "Click the map or the column to filter by age.";
    if (mapUnit?.name != null) {
      hint = `At the centre: ${mapUnit.name}. Click to filter by its age.`;
    }
    return h("div.hero-filter", h("p.hero-filter-hint", hint));
  }

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

/** Who made what the hero is showing. */
function HeroCredits({
  column,
  mapSource,
  center,
  area,
}: {
  column: HeroColumn | null;
  mapSource: MapSourceRef | null;
  center: HeroPoint;
  area: FeaturedArea;
}) {
  const mapHref = `/map/#${area.view.zoom}/${center.lat}/${center.lng}`;

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

  return h("div.hero-credits", [
    columnCredit,
    mapCredit,
    h("p.hero-credit", [
      h(Link, { href: mapHref, className: "credit-link" }, "Open in the map"),
    ]),
  ]);
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
