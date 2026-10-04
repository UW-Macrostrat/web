import hyper from "@macrostrat/hyper";
import { useMemo } from "react";
import { scaleLinear } from "d3-scale";
import {
  Timescale,
  TimescaleOrientation,
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
}

/** A timescale beside the international timescale, on one age scale, after
 * `SharedScaleTimescales` in `@macrostrat/timescale` (whose columns don't yet
 * take a click handler). */
export function TimescaleChart(props: TimescaleChartProps) {
  const { timescaleID, name, intervals, referenceIntervals } = props;

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

  const scale = useAgeScale(tree, intervals.length);
  if (scale == null) return null;

  const [younger, older] = ageExtent(tree);

  let referenceColumn = null;
  if (timescaleID !== INTERNATIONAL_TIMESCALE_ID) {
    referenceColumn = h(ChartColumn, {
      label: "International timescale",
      intervals: reference,
      levels: referenceLevels(older - younger),
      scale,
      className: "reference",
    });
  }

  return h("div.timescale-chart", [
    referenceColumn,
    h(ChartColumn, {
      label: name,
      intervals: tree,
      levels: [1, Math.max(treeDepth(tree), 1)],
      scale,
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
      onClick: (e, d) => navigateToInterval(d),
      className: "timescale",
    }),
  ]);
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
