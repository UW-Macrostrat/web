import hyper from "@macrostrat/hyper";
import { useEffect, useMemo } from "react";
import { scaleLinear } from "d3-scale";
import {
  Timescale,
  TimescaleOrientation,
  useZoomableScale,
  type Interval,
} from "@macrostrat/timescale";
import { navigateToInterval } from "~/components/lex";
import {
  INTERNATIONAL_TIMESCALE_ID,
  buildTimescaleTree,
  referenceLevels,
  treeDepth,
} from "~/components/lex/timescale-data";
import styles from "./timescale-chart.module.sass";

const h = hyper.styled(styles);

interface TimescaleChartProps {
  timescaleID: number;
  name: string;
  intervals: any[];
  referenceIntervals: any[];
  /** The international interval zoomed to, if any */
  focus: Interval | null;
  onFocus(interval: Interval): void;
}

// Pixels held around a zoomed interval, so its neighbors stay clickable
const ZOOM_PADDING = 24;
const ZOOM_DURATION = 600;

/** A timescale beside the international timescale, on one age scale, after
 * `SharedScaleTimescales` in `@macrostrat/timescale` (whose columns don't yet
 * take a click handler). Clicking the international column zooms both to the
 * clicked interval. */
export function TimescaleChart(props: TimescaleChartProps) {
  const { timescaleID, name, intervals, referenceIntervals, focus, onFocus } =
    props;

  const tree = useMemo(
    () => buildTimescaleTree(timescaleID, intervals, name),
    [timescaleID, intervals, name]
  );
  const reference = useMemo(
    () =>
      buildTimescaleTree(
        INTERNATIONAL_TIMESCALE_ID,
        referenceIntervals,
        "Geologic time"
      ),
    [referenceIntervals]
  );

  const baseScale = useAgeScale(tree, intervals.length);
  const zoom = useZoomableScale(baseScale ?? emptyScale, {
    padding: ZOOM_PADDING,
    duration: ZOOM_DURATION,
  });
  useFocusZoom(zoom, focus);

  if (baseScale == null) return null;

  const [younger, older] = ageExtent(tree);

  let referenceColumn = null;
  if (timescaleID !== INTERNATIONAL_TIMESCALE_ID) {
    referenceColumn = h(ChartColumn, {
      label: "International timescale",
      intervals: reference,
      levels: focusedLevels(focus, older - younger),
      scale: zoom.scale,
      className: "reference",
      onClick: (e, d) => {
        if (d.interval != null) onFocus(d.interval);
      },
    });
  }

  return h("div.timescale-chart", [
    referenceColumn,
    h(ChartColumn, {
      label: name,
      intervals: tree,
      levels: [1, Math.max(treeDepth(tree), 1)],
      scale: zoom.scale,
      className: "subject",
      showAgeAxis: referenceColumn == null,
    }),
  ]);
}

function ChartColumn({
  label,
  intervals,
  levels,
  scale,
  className,
  showAgeAxis = true,
  onClick = (e, d) => navigateToInterval(d),
}) {
  // `AgeAxis` reverses the range of the scale it's handed
  const columnScale = useMemo(() => scale.copy(), [scale]);

  return h("div.column", { className }, [
    h("div.column-label", label),
    h(Timescale, {
      intervals,
      scale: columnScale,
      orientation: TimescaleOrientation.VERTICAL,
      absoluteAgeScale: true,
      levels,
      showAgeAxis,
      onClick,
      className: "timescale",
    }),
  ]);
}

const emptyScale = scaleLinear().domain([1, 0]).range([0, 1]);

/** Follow the focused interval: zoom to it, or back out when it's cleared. */
function useFocusZoom(zoom, focus: Interval | null) {
  useEffect(() => {
    if (focus != null) {
      zoom.zoomToInterval(focus);
    } else if (!zoom.isFullExtent) {
      zoom.reset();
    }
    // Only a change of focus starts a zoom, not a change in the zoom's state
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);
}

/** Finer international levels once zoomed: those suiting the focused span,
 * and always the focused interval's own. */
function focusedLevels(focus: Interval | null, span: number): [number, number] {
  if (focus == null) return referenceLevels(span);
  const [minLevel, maxLevel] = referenceLevels(focus.eag - focus.lag);
  return [Math.min(minLevel, focus.lvl), Math.max(maxLevel, focus.lvl)];
}

function useAgeScale(tree: Interval[], count: number) {
  return useMemo(() => {
    if (tree.length < 2) return null;
    const [younger, older] = ageExtent(tree);
    // Longer timescales get more room, within reason for a scrolling page
    const length = Math.min(Math.max(count * 22, 480), 2400);
    return scaleLinear().domain([older, younger]).range([0, length]);
  }, [tree, count]);
}

function ageExtent(tree: Interval[]): [number, number] {
  // Not the root's span: the international tree's root is all of geologic time
  const intervals = tree.filter((d) => d.pid != null);
  return [
    Math.min(...intervals.map((d) => d.lag)),
    Math.max(...intervals.map((d) => d.eag)),
  ];
}
