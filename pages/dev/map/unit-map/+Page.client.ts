/** Macrostrat columns, colored by the units in them at a moment in time.
 *
 * A port of the `Map views/Unit map/With patterns` story from `web-components`.
 * `MacrostratUnitsOverlay` does the work: it fetches the units spanning a thin
 * age window, mixes each column's lithology colors into one footprint color,
 * and — the part this story is about — fills each footprint with the FGDC
 * pattern for its best-matched lithology.
 *
 * The story's Storybook controls (`time`, `ageSpan`, `patterns`) become a
 * context panel here, and the age is synced to the query string so a moment
 * worth looking at can be linked to.
 *
 * The story built its map with `InsetMap`, which brings its own
 * `MapboxMapProvider`. Nesting that inside `MapAreaContainer`'s provider leaves
 * the container's own controls bound to an empty one (see
 * `pages/columns/index/map.client.ts`), so this page composes a plain `MapView`
 * instead and reproduces the two things `InsetMap` contributed: the basic map
 * style, and a basemap stripped of labels, roads and admin boundaries so the
 * footprints are the only thing to read.
 */

import hyper from "@macrostrat/hyper";
import { FormGroup, Slider, Switch } from "@blueprintjs/core";
import {
  getBasicMapStyle,
  MapAreaContainer,
  MapView,
  PanelCard,
} from "@macrostrat/map-interface";
import { MacrostratUnitsOverlay } from "@macrostrat/map-views";
import {
  MacrostratDataProvider,
  useMacrostratDefs,
} from "@macrostrat/data-provider";
import { DataField, IntervalTag } from "@macrostrat/data-components";
import { ErrorBoundary, useInDarkMode } from "@macrostrat/ui-components";
import {
  removeMapLabels,
  removeSourceFromStyle,
  type MapPosition,
} from "@macrostrat/mapbox-utils";
import { apiV2Prefix, mapboxAccessToken } from "@macrostrat-web/settings";
import { atom, useAtom, useAtomValue } from "jotai";
import { useCallback, useMemo, useState } from "react";
import { atomWithSearchParam } from "~/_utils/url-atoms";
import { CommittedNumericInput } from "~/components/time-filter";
import { MapPageNavbar } from "~/components/map-navbar/map-page-navbar";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

/** Shared width for the floating navbar and the context panel below it. */
const PANEL_WIDTH = 320;

/** The story's defaults. Patterns are on: this is the "With patterns" story. */
const DEFAULT_AGE = 100;
const DEFAULT_AGE_SPAN = 0.05;

/** The slider covers the Phanerozoic, where Macrostrat's unit coverage is
 * dense enough for the map to say something. */
const MAX_AGE = 541;

/** An age window wider than this stops being a moment in time. */
const MAX_AGE_SPAN = 50;

/** `InsetMap`'s own starting camera: the bulk of the columns, at a scale where
 * the footprints read as a map rather than as outlines. */
const DEFAULT_MAP_POSITION: MapPosition = {
  camera: { lng: -100, lat: 38, altitude: 5_000_000 },
};

// --- Page state ---

/** The moment being shown, in Ma. In the URL, since it's the one thing worth
 * linking to; the default stays out of it. */
const ageParamAtom = atomWithSearchParam("age");
const ageAtom = atom(
  (get) => readNumberParam(get(ageParamAtom), DEFAULT_AGE, 0, MAX_AGE),
  (get, set, value: number) => {
    const age = clamp(value, 0, MAX_AGE);
    let param: string | null = String(age);
    if (age === DEFAULT_AGE) param = null;
    set(ageParamAtom, param);
  }
);

/** The width of the age window the units are pulled from, in Myr. */
const ageSpanParamAtom = atomWithSearchParam("span");
const ageSpanAtom = atom(
  (get) =>
    readNumberParam(get(ageSpanParamAtom), DEFAULT_AGE_SPAN, 0, MAX_AGE_SPAN),
  (get, set, value: number) => {
    const span = clamp(value, 0, MAX_AGE_SPAN);
    let param: string | null = String(span);
    if (span === DEFAULT_AGE_SPAN) param = null;
    set(ageSpanParamAtom, param);
  }
);

/** Lithology patterns. On by default, so "off" is what's stored. */
const patternsParamAtom = atomWithSearchParam("patterns");
const patternsAtom = atom(
  (get) => get(patternsParamAtom) !== "off",
  (get, set, value: boolean) => {
    let param: string | null = null;
    if (!value) param = "off";
    set(patternsParamAtom, param);
  }
);

function readNumberParam(
  raw: string | null,
  fallback: number,
  min: number,
  max: number
): number {
  if (raw == null) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return clamp(value, min, max);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// --- Page ---

export function Page() {
  return h(
    ErrorBoundary,
    h(MacrostratDataProvider, { baseURL: apiV2Prefix }, h(UnitMapPage))
  );
}

function UnitMapPage() {
  const [isOpen, setOpen] = useState(true);
  const age = useAtomValue(ageAtom);
  const ageSpan = useAtomValue(ageSpanAtom);
  const patterns = useAtomValue(patternsAtom);

  const inDarkMode = useInDarkMode();
  const mapStyle = useMemo(
    () => getBasicMapStyle({ inDarkMode }),
    [inDarkMode]
  );

  return h(
    MapAreaContainer,
    {
      navbar: h(MapPageNavbar, {
        isOpen,
        onToggle: () => setOpen(!isOpen),
        width: PANEL_WIDTH,
      }),
      contextPanel: h(
        PanelCard,
        { style: { width: PANEL_WIDTH } },
        h(UnitMapControls)
      ),
      contextPanelOpen: isOpen,
    },
    h(
      MapView,
      {
        style: mapStyle,
        mapboxToken: mapboxAccessToken,
        mapPosition: DEFAULT_MAP_POSITION,
        enableTerrain: false,
        transformStyle: stripBasemapDetail,
      },
      h(MacrostratUnitsOverlay, { time: age, ageSpan, patterns })
    )
  );
}

/** What `InsetMap` does to its basemap: no labels, no roads, no admin
 * boundaries, so the column footprints are the only thing to read. */
function stripBasemapDetail(style) {
  let newStyle = removeMapLabels(style);
  newStyle = removeSourceFromStyle(newStyle, null, "admin");
  newStyle = removeSourceFromStyle(newStyle, null, "road");
  return removeSourceFromStyle(newStyle, null, "aeroway");
}

// --- Controls ---

function UnitMapControls() {
  const [ageSpan, setAgeSpan] = useAtom(ageSpanAtom);
  const [patterns, setPatterns] = useAtom(patternsAtom);

  return h("div.unit-map-controls", [
    h("p.intro", [
      "Macrostrat columns, colored by the mix of lithologies in the units ",
      "present at a moment in time. Patterns are the FGDC symbol for each ",
      "column's best-matched lithology.",
    ]),
    h(AgeControl),
    h(
      FormGroup,
      {
        label: h("span", ["Age window ", h("span.unit", "(Myr)")]),
        className: "span-control",
        helperText: "Width of the window units are pulled from",
      },
      h(CommittedNumericInput, {
        value: ageSpan,
        min: 0,
        max: MAX_AGE_SPAN,
        minorStepSize: 0.01,
        onCommit: (value) => setAgeSpan(value ?? DEFAULT_AGE_SPAN),
      })
    ),
    h(Switch, {
      className: "patterns-toggle",
      label: "Lithology patterns",
      checked: patterns,
      onChange: (evt) => setPatterns(evt.currentTarget.checked),
    }),
  ]);
}

/** The age, as a slider to scrub with and a box to type in.
 *
 * The slider only commits on release: every committed value refetches the
 * units for that moment, so a drag would otherwise fire a request per tick. */
function AgeControl() {
  const [age, setAge] = useAtom(ageAtom);
  const [draft, setDraft] = useState<number | null>(null);
  const interval = useIntervalForAge(age);

  const onRelease = useCallback(
    (value: number) => {
      setDraft(null);
      setAge(value);
    },
    [setAge]
  );

  let intervalField = null;
  if (interval != null) {
    intervalField = h(
      DataField,
      { label: "Interval" },
      h(IntervalTag, { interval, showAgeRange: true })
    );
  }

  return h("div.age-control", [
    h(
      FormGroup,
      { label: h("span", ["Age ", h("span.unit", "(Ma)")]) },
      h(CommittedNumericInput, {
        value: age,
        min: 0,
        max: MAX_AGE,
        onCommit: (value) => setAge(value ?? DEFAULT_AGE),
      })
    ),
    h(Slider, {
      className: "age-slider",
      min: 0,
      max: MAX_AGE,
      stepSize: 1,
      // Blueprint's own labels are turned off: the value is in the box above,
      // and its end labels overhang the track far enough to clip against the
      // panel. The scale below is the same information, laid out here.
      labelRenderer: false,
      value: draft ?? age,
      onChange: setDraft,
      onRelease,
    }),
    h("div.age-scale", [h("span", "0"), h("span", `${MAX_AGE} Ma`)]),
    intervalField,
  ]);
}

/** The geologic period containing an age, for a readout alongside the slider.
 * Periods are the level that stays legible while scrubbing — an epoch or age
 * name changes too often to register. */
function useIntervalForAge(age: number) {
  const intervals = useMacrostratDefs("intervals");

  return useMemo(() => {
    if (intervals == null) return null;
    for (const int of intervals.values()) {
      if (int.int_type !== "period") continue;
      if (age > int.b_age || age < int.t_age) continue;
      return { ...int, id: int.int_id };
    }
    return null;
  }, [intervals, age]);
}
