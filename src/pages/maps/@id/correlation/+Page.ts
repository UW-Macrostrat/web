import { Popover, Spinner } from "@blueprintjs/core";
import { FullscreenPage } from "~/layouts";
import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";
import { PageBreadcrumbs } from "~/renderer";
import { useLegendData, MapInfo } from "../utils";
import { useElementSize, useInDarkMode } from "@macrostrat/ui-components";
import { useMemo, useRef } from "react";
import { Group } from "@visx/group";
import { scaleBand, scaleLinear } from "@visx/scale";
import { AxisLeft } from "@visx/axis";
import { Timescale, TimescaleOrientation } from "@macrostrat/timescale";
import { ForeignObject } from "@macrostrat/column-components";
import { useState } from "react";
import { Bar } from "@visx/shape";

const h = hyper.styled(styles);

export function Page({ map }) {
  const ref = useRef(null);
  const size = useElementSize(ref);
  const legendData = useLegendData(map);

  const correlationChartData = useMemo(() => {
    console.log(legendData);
    return buildCorrelationChartData(legendData);
  }, [legendData]);

  return h(FullscreenPage, [
    h("div.page-inner", [
      h(PageBreadcrumbs),
      h("div.vis-container", { ref }, [
        h.if(legendData != null)(CorrelationChart, {
          map,
          ...size,
          data: correlationChartData,
        }),
      ]),
    ]),
  ]);
}

type IntervalShort = {
  id: number;
  b_age: number;
  t_age: number;
};

function buildCorrelationChartData(
  legendData: LegendItem[]
): CorrelationItem[] {
  /** Build the data for a correlation chart */
  if (legendData == null) {
    return [];
  }

  let data1 = legendData.map((d, i) => {
    return {
      legend_id: d.legend_id.toString(),
      ageRange: mergeAgeRanges([
        getAgeRangeForInterval(d.b_interval),
        getAgeRangeForInterval(d.t_interval),
      ]),
      frequency: i,
      color: d.color,
    };
  });

  return data1.sort((a, b) => intervalComparison(a.ageRange, b.ageRange));
}

type AgeRange = [number, number];

type CorrelationItem = {
  color: string;
  ageRange: AgeRange;
  legend_id: number;
};

const verticalMargin = 60;

export type BarsProps = {
  width: number;
  height: number;
  events?: boolean;
  map: MapInfo;
  data: CorrelationItem[];
};

interface LegendItem {
  legend_id: number;
  name: string;
  strat_name: string;
  age: string;
  lith: string;
  descrip: string;
  comments: string;
  liths: string;
  b_interval: IntervalShort;
  t_interval: IntervalShort;
  best_age_bottom?: number;
  best_age_top?: number;
  unit_ids: string;
  concept_ids: string;
  color: string;
}

function CorrelationChart({ width, height, events = false, data }: BarsProps) {
  // bounds
  const xMax = width;
  const yMax = height - verticalMargin;

  const [selectedLegendID, setSelectedLegendID] = useState<number | null>(null);

  const domain = useMemo(
    () => mergeAgeRanges(data.map((d) => d.ageRange)),
    [data]
  );

  const xMin = 100;

  const selectedItem = useMemo(
    () => data.find((d) => d.legend_id === selectedLegendID),
    [data, selectedLegendID]
  );

  // scales, memoize for performance
  const xScale = useMemo(
    () =>
      scaleBand<string>({
        range: [xMin, xMax],
        round: false,
        domain: data.map((d, i) => `${d.legend_id}`),
        padding: 0.2,
      }),
    [xMax]
  );
  const yScale = useMemo(() => {
    return scaleLinear<number>({
      range: [yMax, 0],
      round: false,
      domain,
    });
  }, [domain, yMax]);

  if (data == null) {
    return h(Spinner);
  }

  if (width < 10) return null;

  return h("div.vis-frame", [
    h("svg", { width, height }, [
      h(Group, { top: verticalMargin / 2, key: "main-plot" }, [
        h(AgeAxis, {
          scale: yScale,
          width: 40,
        }),
        h(ForeignObject, { width: 60, height, x: 40 }, [
          h(Timescale, {
            orientation: TimescaleOrientation.VERTICAL,
            length: yMax,
            // Bug in timescale component, the age range appears to be changed
            // if we pass it in statically.
            ageRange: [...domain],
            absoluteAgeScale: true,
            levels: [2, 3],
          }),
        ]),
        h(
          Group,
          data.map((d, i) => {
            const { ageRange } = d;

            const yMin = yScale(ageRange[1]);
            const yMax = yScale(ageRange[0]);

            const barWidth = xScale.bandwidth();
            const barHeight = yMax - yMin;
            const barX = xScale(`${d.legend_id}`);
            const barY = yMin;
            return h(Bar, {
              key: d.legend_id,
              x: barX,
              y: barY,
              width: barWidth,
              height: barHeight,
              fill: d.color,
              onClick() {
                console.log("Setting selected legend ID to ", d.legend_id);
                setSelectedLegendID(d.legend_id);
              },
            });
          })
        ),
        h(ForeignObject, { width, height, className: "popover-container" }, [
          h(SelectedLegendItemPopover, { item: selectedItem, xScale, yScale }),
        ]),
      ]),
    ]),
  ]);
}

function SelectedLegendItemPopover({
  item,
  xScale,
  yScale,
}: {
  item: CorrelationItem | null;
  xScale: any;
  yScale: any;
}) {
  if (item == null) {
    return null;
  }

  const content = h("div", [
    h("h3", item.legend_id.toString()),
    h("p", item.color),
  ]);

  const xv = xScale(`${item.legend_id}`);
  const top = yScale(item.ageRange[1]);
  const bottom = yScale(item.ageRange[0]);

  return h(
    "div.popover-main",
    {
      style: {
        top: top,
        left: xv,
        width: xScale.bandwidth(),
        height: bottom - top,
      },
    },
    h(
      Popover,
      { content, isOpen: true, usePortal: true },
      h("span.popover-target")
    )
  );
}

function AgeAxis({ scale, width }) {
  const darkMode = useInDarkMode();

  const axisColor = darkMode ? "#ccc" : "#222";

  return h(AxisLeft, {
    scale,
    left: width,
    stroke: axisColor,
    tickStroke: axisColor,
    labelProps: {
      fill: axisColor,
    },
    tickLabelProps: () => {
      return {
        fill: axisColor,
        textAnchor: "end",
        verticalAnchor: "middle",
        dx: "-0.25em",
        fontSize: 12,
      };
    },
  });
}

function getAgeRangeForInterval(interval: IntervalShort): AgeRange | null {
  /** Get the age range for an interval, building up an index as we go */
  return [interval.b_age, interval.t_age];
}

enum MergeMode {
  Inner,
  Outer,
}

function mergeAgeRanges(
  ranges: AgeRange[],
  mergeMode: MergeMode = MergeMode.Outer
): AgeRange {
  /** Merge a set of age ranges to get the inner or outer bounds */
  let min = Infinity;
  let max = 0;
  // Negative ages are not handled

  if (mergeMode === MergeMode.Inner) {
    min = Math.min(...ranges.map((d) => d[0]));
    max = Math.max(...ranges.map((d) => d[1]));
  } else {
    min = Math.max(...ranges.map((d) => d[0]));
    max = Math.min(...ranges.map((d) => d[1]));
  }

  // Age ranges should start with the oldest (largest) age
  if (min < max) {
    return [max, min];
  }
  return [min, max];
}

function midpointAge(range: [number, number]) {
  return (range[0] + range[1]) / 2;
}

enum AgeRangeRelationship {
  Disjoint,
  Contains,
  Contained,
  Identical,
}

function convertToForwardOrdinal(a: AgeRange): AgeRange {
  /** Age ranges are naturally expressed as [b_age, t_age] where
   * b_age is the older age and t_age is the younger age. This function
   * converts the age range to [min, max] where min is the oldest age,
   * expressed as negative numbers. This assists with intuitive ordering
   * in certain cases.
   */
  return [-a[0], -a[1]];
}

function compareAgeRanges(a: AgeRange, b: AgeRange): AgeRangeRelationship {
  const a1 = convertToForwardOrdinal(a);
  const b1 = convertToForwardOrdinal(b);
  /** Compare two age ranges */
  if (a1[0] > b1[1] || a1[1] < b1[0]) {
    return AgeRangeRelationship.Disjoint;
  }
  if (a1[0] === b1[0] && a1[1] === b1[1]) {
    return AgeRangeRelationship.Identical;
  }
  if (a1[0] <= b1[0] && a1[1] >= b1[1]) {
    return AgeRangeRelationship.Contains;
  }
  if (a1[0] >= b1[0] && a1[1] <= b1[1]) {
    return AgeRangeRelationship.Contained;
  }
}

function intervalComparison(a: AgeRange, b: AgeRange) {
  // If age range fully overlaps with another, put the wider one first
  return midpointAge(b) - midpointAge(a);
}
