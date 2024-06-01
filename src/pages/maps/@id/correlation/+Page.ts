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
import fetch from "cross-fetch";

const h = hyper.styled(styles);

const apiRoute = apiV2Prefix + "/defs/intervals";
const resultUnwrapper = (res) => res.success.data;

export function Page({ map }) {
  const ref = useRef(null);
  const size = useElementSize(ref);
  const legendData = useLegendData(map);
  const intervals = useAPIResult(apiRoute, resultUnwrapper);

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

type CorrelationItem = {
  legend_id: number;
  name: string;
  strat_name: string;
  age: string;
  lith: string;
  descrip: string;
  comments: string;
  liths: string;
  b_interval: number;
  t_interval: number;
  best_age_bottom: string;
  best_age_top: string;
  unit_ids: string;
  concept_ids: string;
};

function buildCorrelationChartData(legendData, intervals): LetterFrequency[] {
  if (legendData == null) {
    return [];
  }
  return legendData.map((d, i) => {
    return {
      letter: d.legend_id.toString(),
      frequency: i,
    };
  });
}

type LetterFrequency = {
  letter: string;
  frequency: number;
};

const letterFrequency: LetterFrequency[] = [
  { letter: "A", frequency: 0.08167 },
  { letter: "B", frequency: 0.01492 },
  { letter: "C", frequency: 0.02782 },
  { letter: "D", frequency: 0.04253 },
  { letter: "E", frequency: 0.12702 },
  { letter: "F", frequency: 0.02288 },
  { letter: "G", frequency: 0.02015 },
  { letter: "H", frequency: 0.06094 },
  { letter: "I", frequency: 0.06966 },
  { letter: "J", frequency: 0.00153 },
  { letter: "K", frequency: 0.00772 },
  { letter: "L", frequency: 0.04025 },
  { letter: "M", frequency: 0.02406 },
  { letter: "N", frequency: 0.06749 },
  { letter: "O", frequency: 0.07507 },
  { letter: "P", frequency: 0.01929 },
  { letter: "Q", frequency: 0.00095 },
  { letter: "R", frequency: 0.05987 },
  { letter: "S", frequency: 0.06327 },
  { letter: "T", frequency: 0.09056 },
  { letter: "U", frequency: 0.02758 },
  { letter: "V", frequency: 0.00978 },
  { letter: "W", frequency: 0.0236 },
  { letter: "X", frequency: 0.0015 },
  { letter: "Y", frequency: 0.01974 },
  { letter: "Z", frequency: 0.00074 },
];

const data = letterFrequency.slice(5);
const verticalMargin = 120;

// accessors
const getLetter = (d: LetterFrequency) => d.letter;
const getLetterFrequency = (d: LetterFrequency) => Number(d.frequency) * 100;

export type BarsProps = {
  width: number;
  height: number;
  events?: boolean;
  map: MapInfo;
  data: LetterFrequency[];
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
  b_interval: number;
  t_interval: number;
  best_age_bottom: string;
  best_age_top: string;
  unit_ids: string;
  concept_ids: string;
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
        domain: data.map(getLetter),
        padding: 0.4,
      }),
    [xMax]
  );
  const yScale = useMemo(
    () =>
      scaleLinear<number>({
        range: [yMax, 0],
        round: true,
        domain: [0, Math.max(...data.map(getLetterFrequency))],
      }),
    [yMax]
  );

  if (data == null) {
    return h(Spinner);
  }

  if (width < 10) return null;

  return h("svg", { width, height }, [
    h(
      Group,
      { top: verticalMargin / 2 },
      data.map((d) => {
        const letter = getLetter(d);
        const barWidth = xScale.bandwidth();
        const barHeight = yMax - (yScale(getLetterFrequency(d)) ?? 0);
        const barX = xScale(letter);
        const barY = yMax - barHeight;
        return h(Bar, {
          key: `bar-${letter}`,
          x: barX,
          y: barY,
          width: barWidth,
          height: barHeight,
          fill: "rgba(23, 233, 217, .5)",
          onClick() {
            if (events) alert(`clicked: ${JSON.stringify(Object.values(d))}`);
          },
        });
      })
    ),
  ]);
}
