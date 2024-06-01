import { HotkeysProvider, Spinner } from "@blueprintjs/core";
import DataSheet from "@macrostrat/data-sheet2";
import { FullscreenPage } from "~/layouts";
import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";
import { PageBreadcrumbs } from "~/renderer";
import { useLegendData, MapInfo } from "../utils";
import {
  useElementSize,
  useAPIResult,
  useInDarkMode,
} from "@macrostrat/ui-components";
import { useMemo, useRef } from "react";
import { Bar } from "@visx/shape";
import { Group } from "@visx/group";
import { scaleBand, scaleLinear } from "@visx/scale";
import { apiV2Prefix } from "@macrostrat-web/settings";
import { AxisLeft } from "@visx/axis";
import { Timescale, TimescaleOrientation } from "@macrostrat/timescale";
import { ForeignObject } from "@macrostrat/column-components";

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

  return data1.sort((a, b) => {
    return midpointAge(b.ageRange) - midpointAge(a.ageRange);
  });
}

type CorrelationItem = {
  color: string;
  ageRange: [number, number];
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

  const domain = useMemo(
    () => mergeAgeRanges(data.map((d) => d.ageRange)),
    [data]
  );

  const xMin = 60;

  // scales, memoize for performance
  const xScale = useMemo(
    () =>
      scaleBand<string>({
        range: [xMin, xMax],
        round: true,
        domain: data.map((d, i) => `${i}`),
        padding: 0.4,
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
          { key: "bars" },
          data.map((d, i) => {
            const { ageRange } = d;

            const yMin = yScale(ageRange[1]);
            const yMax = yScale(ageRange[0]);

            const barWidth = xScale.bandwidth();
            const barHeight = yMax - yMin;
            const barX = xScale(`${i}`);
            const barY = yMin;
            return h("rect", {
              key: d.legend_id,
              x: barX,
              y: barY,
              width: barWidth,
              height: barHeight,
              fill: d.color,
              onClick() {
                if (events)
                  alert(`clicked: ${JSON.stringify(Object.values(d))}`);
              },
            });
          })
        ),
      ]),
    ]),
  ]);
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

function getAgeRangeForInterval(
  interval: IntervalShort
): [number, number] | null {
  /** Get the age range for an interval, building up an index as we go */
  return [interval.b_age, interval.t_age];
}

enum MergeMode {
  Inner,
  Outer,
}

function mergeAgeRanges(
  ranges: [number, number][],
  mergeMode: MergeMode = MergeMode.Outer
): [number, number] {
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
