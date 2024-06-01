import { HotkeysProvider, Spinner } from "@blueprintjs/core";
import DataSheet from "@macrostrat/data-sheet2";
import { FullscreenPage } from "~/layouts";
import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";
import { PageBreadcrumbs } from "~/renderer";
import { useLegendData, MapInfo } from "../utils";
import { useElementSize, useAPIResult } from "@macrostrat/ui-components";
import { useMemo, useRef } from "react";
import { Bar } from "@visx/shape";
import { Group } from "@visx/group";
import { scaleBand, scaleLinear } from "@visx/scale";
import { apiV2Prefix } from "@macrostrat-web/settings";
import { AxisLeft } from "@visx/axis";

const h = hyper.styled(styles);

const apiRoute = apiV2Prefix + "/defs/intervals";
const resultUnwrapper = (res) => res.success.data;

export function Page({ map }) {
  const ref = useRef(null);
  const size = useElementSize(ref);
  const legendData = useLegendData(map);
  const intervals = useAPIResult(apiRoute, { all: true }, resultUnwrapper);

  const correlationChartData = useMemo(() => {
    return buildCorrelationChartData(legendData, intervals);
  }, [legendData, intervals]);

  return h(FullscreenPage, [
    h("div.page-inner", [
      h(PageBreadcrumbs),
      h("div.vis-container", { ref }, [
        h.if(legendData != null)(Example, {
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
  legendData: LegendItem[],
  intervals: IntervalShort[]
): CorrelationItem[] {
  /** Build the data for a correlation chart */
  if (legendData == null) {
    return [];
  }

  console.log(legendData, intervals);

  return legendData.map((d, i) => {
    return {
      letter: d.legend_id.toString(),
      ageRange: mergeAgeRanges([
        getAgeRangeForInterval(d.b_interval),
        getAgeRangeForInterval(d.t_interval),
      ]),
      frequency: i,
      color: d.color,
    };
  });
}

type CorrelationItem = {
  letter: string;
  color: string;
  ageRange: [number, number];
};

const verticalMargin = 120;

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

function Example({ width, height, events = false, data }: BarsProps) {
  // bounds
  const xMax = width;
  const yMax = height - verticalMargin;

  // scales, memoize for performance
  const xScale = useMemo(
    () =>
      scaleBand<string>({
        range: [0, xMax],
        round: true,
        domain: data.map((d, i) => `${i}`),
        padding: 0.4,
      }),
    [xMax]
  );
  const yScale = useMemo(() => {
    const domain = mergeAgeRanges(
      data.map((d) => d.ageRange),
      MergeMode.Outer
    );
    console.log("Domain: ", domain);
    return scaleLinear<number>({
      range: [0, yMax],
      round: true,
      domain,
    });
  }, [data, yMax]);

  if (data == null) {
    return h(Spinner);
  }

  if (width < 10) return null;

  const data1 = data.sort((a, b) => {
    return midpointAge(b.ageRange) - midpointAge(a.ageRange);
  });

  return h("svg", { width, height }, [
    h(Group, { top: verticalMargin / 2 }, [
      h(AxisLeft, {
        scale: yScale,
        left: 30,
      }),
      h(
        Group,
        data1.map((d, i) => {
          const { ageRange } = d;
          const yMin = yScale(ageRange[0]);
          const yMax = yScale(ageRange[1]);
          const barWidth = xScale.bandwidth();
          const barHeight = yMax - yMin;
          const barX = xScale(`${i}`);
          const barY = yMin;
          return h(Bar, {
            key: `bar-${i}`,
            x: barX,
            y: barY,
            width: barWidth,
            height: barHeight,
            fill: d.color,
            onClick() {
              if (events) alert(`clicked: ${JSON.stringify(Object.values(d))}`);
            },
          });
        })
      ),
    ]),
  ]);
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
  if (mergeMode === MergeMode.Inner) {
    const min = Math.min(...ranges.map((d) => d[0]));
    const max = Math.max(...ranges.map((d) => d[1]));
    return [min, max];
  } else {
    const min = Math.max(...ranges.map((d) => d[0]));
    const max = Math.min(...ranges.map((d) => d[1]));
    return [min, max];
  }
}

function midpointAge(range: [number, number]) {
  return (range[0] + range[1]) / 2;
}
