/** The hero's stratigraphic column: the panel beside the map, and the unit
 * boxes in it — colored by age, adapted to the theme, washed out when they fall
 * outside the age filter.
 *
 * Its own module so it renders without mapbox-gl. The live hero uses it with
 * unit selection and the map's zoom-to-column control; the server renders it
 * to static markup for the still (`hero-column-static.server.ts`), so the page
 * opens with the column as well as the map and loads no column JavaScript
 * until the reader engages.
 */
import h from "./hero.module.sass";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { Card } from "@blueprintjs/core";
import {
  Column,
  HybridScaleType,
  UnitComponent,
} from "@macrostrat/column-views";
import { ColumnAxisType } from "@macrostrat/column-components";
import {
  asChromaColor,
  getLuminanceAdjustedColorScheme,
} from "@macrostrat/color-utils";
import type { UnitLong } from "@macrostrat/api-types";
import { Link } from "~/components";
import { summarizeUnits, type HeroColumn } from "./hero-data";
import { colorForAgeRange, overlapsRange, type TimeRange } from "./time-range";

/** What each unit box needs to draw itself, in a context so the filter can
 * change without handing the column a new `unitComponent` and remounting every
 * unit in it. */
/** A column as the server renders it for the still: static markup for each
 * theme (`hero-column-static.server.ts`). */
export interface StaticHeroColumn {
  light: string;
  dark: string;
}

export interface ColumnDisplay {
  timeRange: TimeRange | null;
  intervals: any[] | null;
  inDarkMode: boolean;
}

export const ColumnDisplayContext = createContext<ColumnDisplay>({
  timeRange: null,
  intervals: null,
  inDarkMode: false,
});

/** The inset's width in pixels. The column is drawn exactly this wide and the
 * box has no padding, so the units run edge to edge: the box *is* the column. */
export const COLUMN_WIDTH = 204;

/** For a unit with neither an age color nor one of its own. A literal rather
 * than a token because it is handed to chroma and then to an SVG fill, neither
 * of which resolves a CSS variable. */
const FALLBACK_UNIT_COLOR = "#c5cbd3";

export function ColumnPanel({
  column,
  href,
  onSelectUnit,
  focusButton = null,
}: {
  column: HeroColumn;
  /** The column page to link the name to. */
  href: string;
  /** Unit clicks, in the live hero. Without it the column is a picture. */
  onSelectUnit?(unitID: number | null, unit: UnitLong | null): void;
  /** The live hero's zoom-to-column control; it needs the map. */
  focusButton?: ReactNode;
}) {
  const { info, units } = column;
  const stats = useMemo(() => summarizeUnits(units), [units]);
  const scrollRef = useRef<HTMLDivElement>(null);
  useScrollToRange(scrollRef);

  return h(Card, { className: h["hero-column-panel"] }, [
    h("div.column-inset-header", [
      h("div.column-inset-titles", [
        h(Link, { href, className: "col-name" }, info.col_name),
        h(
          "p.column-inset-summary",
          `${stats.n_units} units spanning ${formatAge(stats.b_age)}`
        ),
      ]),
      focusButton,
    ]),
    h(
      "div.column-inset-scroll",
      { ref: scrollRef },
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
        allowUnitSelection: onSelectUnit != null,
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

/** A new age filter brings the units inside it into view: centred when they
 * fit the panel, their top edge otherwise. They are found by the class
 * `HeroUnit` marks them with, so this never has to know how the column orders
 * or groups them. */
function useScrollToRange(scrollRef: React.RefObject<HTMLDivElement>) {
  const { timeRange } = useContext(ColumnDisplayContext);
  useEffect(() => {
    const scroller = scrollRef.current;
    if (timeRange == null || scroller == null) return;
    const marked = scroller.querySelectorAll("g.hero-unit.in-range");
    if (marked.length === 0) return;
    const box = scroller.getBoundingClientRect();
    let top = Infinity;
    let bottom = -Infinity;
    marked.forEach((el) => {
      const rect = el.getBoundingClientRect();
      top = Math.min(top, rect.top);
      bottom = Math.max(bottom, rect.bottom);
    });
    top += scroller.scrollTop - box.top;
    bottom += scroller.scrollTop - box.top;
    let target = top - 8;
    if (bottom - top < box.height) {
      target = top - (box.height - (bottom - top)) / 2;
    }
    scroller.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
  }, [timeRange, scrollRef]);
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
export function HeroUnit(props) {
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

  // Wrapped in a group of our own so the filter can be read off the DOM
  // (`useScrollToRange`): a class on the unit itself would be swallowed, see
  // above. Not in the style module, so these names stay as written.
  let groupClass = "hero-unit";
  if (timeRange != null && inRange) groupClass = "hero-unit in-range";

  // Hack to use a simpler fill without text shadow
  return h(
    "g",
    { className: groupClass },
    h(UnitComponent, { ...props, backgroundColor })
  );
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

function formatAge(ma: number): string {
  if (ma >= 1000) return `${(ma / 1000).toFixed(1)} Gyr`;
  return `${Math.round(ma)} Myr`;
}
