/** Recharts figures for the usage-stats page. Series colors are CSS variables
 * from main.module.sass, so dark mode picks its own validated steps. */
import hyper from "@macrostrat/hyper";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Bots,
  CacheBin,
  COMPILATION_CUTOVER,
  MapViewsBin,
  EstimatedPoint,
  Referrer,
  RequestsPoint,
  formatCount,
  formatFullCount,
  formatPercent,
  referrerLabel,
} from "./api";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

const SERIES_1 = "var(--usage-series-1)";
const SERIES_2 = "var(--usage-series-2)";
const SERIES_3 = "var(--usage-series-3)";
const INK = "var(--pz-text-subtle-color, #52514e)";
const GRID = "var(--pz-border-muted-color, #e5e4df)";

// The first day the access-log harvester covers; earlier rows are the old logger's.
const HARVEST_START = "2026-03-23";

const tick = { fill: INK, fontSize: 12 };
const tooltipStyle = {
  contentStyle: {
    background: "var(--pz-panel-background-color, #fff)",
    border: "1px solid var(--pz-border-color, #ccc)",
    borderRadius: 4,
    fontSize: 12,
  },
  labelStyle: { color: "var(--pz-text-color, #111)" },
};

function dateAxis() {
  return h(XAxis, {
    dataKey: "date",
    tick,
    stroke: GRID,
    minTickGap: 32,
    tickFormatter: formatDateTick,
  });
}

function countAxis(width = 52) {
  return h(YAxis, { tick, stroke: GRID, width, tickFormatter: formatCount });
}

function grid() {
  return h(CartesianGrid, { stroke: GRID, vertical: false });
}

function formatDateTick(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  return date.toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
    day: "numeric",
    timeZone: "UTC",
  });
}

function countTooltip() {
  return h(Tooltip, {
    ...tooltipStyle,
    formatter: (value: number) => formatFullCount(value),
  });
}

interface SeriesSpec {
  key: "organic" | "presumed" | "bot";
  name: string;
  color: string;
  fillOpacity: number;
}

const organicSeries: SeriesSpec = {
  key: "organic",
  name: "Organic",
  color: SERIES_1,
  fillOpacity: 0.35,
};
const presumedSeries: SeriesSpec = {
  key: "presumed",
  name: "Presumed bots",
  color: SERIES_3,
  fillOpacity: 0.12,
};
const knownBotSeries: SeriesSpec = {
  key: "bot",
  name: "Known bots",
  color: SERIES_2,
  fillOpacity: 0.12,
};

function requestSeries(bots: Bots): SeriesSpec[] {
  if (bots === "exclude") return [organicSeries];
  // Presumed bots sit on organic, so their edge is all untagged traffic.
  if (bots === "only") return [presumedSeries, knownBotSeries];
  return [organicSeries, presumedSeries, knownBotSeries];
}

/** A dashed rule at the bin holding `date`, if the series spans it. */
function eventLine(data: { date: string }[], date: string, label: string) {
  if (data.length === 0) return null;
  if (data[0].date >= date || data[data.length - 1].date < date) return null;
  const at = data.filter((d) => d.date <= date).pop()?.date;
  return h(ReferenceLine, {
    key: label,
    x: at,
    yAxisId: "count",
    stroke: INK,
    strokeDasharray: "4 4",
    label: {
      value: label,
      position: "insideTopLeft",
      fill: INK,
      fontSize: 11,
    },
  });
}

function hitRate(hits: number | null, misses: number | null): number | null {
  if (hits == null || misses == null) return null;
  const known = hits + misses;
  if (known === 0) return null;
  return hits / known;
}

// Edge keys are named per series, hence the open record.
type ChartPoint = EstimatedPoint & {
  l1?: number | null;
  l2?: number | null;
} & Record<string, any>;

function withCacheRates(
  points: EstimatedPoint[],
  cache: CacheBin[] | null
): ChartPoint[] {
  if (cache == null) return points;
  const byDate = new Map(cache.map((c) => [c.date, c]));
  return points.map((p) => {
    const c = byDate.get(p.date);
    if (c == null) return p;
    return {
      ...p,
      l1: hitRate(c.l1_hits, c.l1_misses),
      l2: hitRate(c.l2_hits, c.l2_misses),
    };
  });
}

function countDomain(points: RequestsPoint[], trendScale: boolean) {
  if (!trendScale) return {};
  const peak = Math.max(0, ...points.map((p) => p.trend ?? 0));
  if (peak === 0) return {};
  return { domain: [0, 2 * peak], allowDataOverflow: true };
}

function isEstimate(series: SeriesSpec, point: EstimatedPoint): boolean {
  if (series.key === "presumed") return true;
  if (series.key === "organic") return point.estimated;
  return point.partial;
}

function edgeKey(series: SeriesSpec, style: "measured" | "estimated"): string {
  return `${series.key}_${style}`;
}

/** Each layer's top edge, split into measured and estimated runs. An
 * estimated run takes its measured neighbours, so the two lines meet. */
function withEdges(points: ChartPoint[], series: SeriesSpec[]): ChartPoint[] {
  const tops = points.map((p) => {
    let top = 0;
    return series.map((s) => {
      const value = p[s.key];
      if (value == null) return null;
      top += value;
      return top;
    });
  });
  return points.map((p, i) => {
    const point: ChartPoint = { ...p };
    series.forEach((s, j) => {
      const estimate = (k: number) =>
        k >= 0 && k < points.length && isEstimate(s, points[k]);
      if (!estimate(i)) point[edgeKey(s, "measured")] = tops[i][j];
      if (estimate(i) || estimate(i - 1) || estimate(i + 1))
        point[edgeKey(s, "estimated")] = tops[i][j];
    });
    return point;
  });
}

function edgeLines(series: SeriesSpec, showEstimateInLegend: boolean) {
  let width = 2;
  if (series === organicSeries) width = 2.5;
  let legendType = "none";
  if (showEstimateInLegend) legendType = "plainline";
  const line = {
    yAxisId: "count",
    stroke: series.color,
    strokeWidth: width,
    dot: false,
    tooltipType: "none",
    connectNulls: false,
    isAnimationActive: false,
  };
  return [
    h(Line, {
      ...line,
      key: edgeKey(series, "measured"),
      dataKey: edgeKey(series, "measured"),
      legendType: "none",
    }),
    h(Line, {
      ...line,
      key: edgeKey(series, "estimated"),
      dataKey: edgeKey(series, "estimated"),
      name: `${series.name} (estimated)`,
      legendType,
      strokeDasharray: "5 3",
    }),
  ];
}

function formatTooltipValue(value: number, name: string, item: any) {
  if (item?.dataKey === "l1" || item?.dataKey === "l2") {
    return formatPercent(value);
  }
  const point: EstimatedPoint | undefined = item?.payload;
  let label = name;
  if (point?.partial || (item?.dataKey === "organic" && point?.estimated))
    label = `${name} (estimated)`;
  return [formatFullCount(value), label];
}

function cacheOverlay() {
  return [
    h(YAxis, {
      key: "rate-axis",
      yAxisId: "rate",
      orientation: "right",
      tick,
      stroke: GRID,
      width: 48,
      domain: [0, 1],
      tickFormatter: formatPercent,
    }),
    h(Line, {
      key: "l1",
      yAxisId: "rate",
      dataKey: "l1",
      name: "Varnish (L1) hit rate",
      stroke: INK,
      strokeWidth: 2,
      dot: false,
      connectNulls: false,
      isAnimationActive: false,
    }),
    h(Line, {
      key: "l2",
      yAxisId: "rate",
      dataKey: "l2",
      name: "Tile cache (L2) hit rate, of L1 misses",
      stroke: INK,
      strokeWidth: 2,
      strokeDasharray: "6 3",
      dot: false,
      connectNulls: false,
      isAnimationActive: false,
    }),
  ];
}

/** Requests as stacked areas, edged solid where measured and dashed where
 * estimated; with `cache`, hit rates on a right-hand axis. */
export function RequestsChart({
  data,
  bots,
  trendScale = false,
  cache = null,
}: {
  data: EstimatedPoint[];
  bots: Bots;
  /** Cap the count axis at twice the trend's peak, clipping bot phases. */
  trendScale?: boolean;
  cache?: CacheBin[] | null;
}) {
  const series = requestSeries(bots);
  const points = withEdges(withCacheRates(data, cache), series);
  const organicEstimated =
    series.includes(organicSeries) && data.some((d) => d.estimated);
  let legend = null;
  if (series.length > 1 || cache != null || organicEstimated)
    legend = h(Legend, { verticalAlign: "top", height: 28 });
  let overlay = [];
  if (cache != null) overlay = cacheOverlay();
  // Organic's edges last, so the bot layers never cover them.
  const bySalience = [...series].reverse();

  return h(ResponsiveContainer, { width: "100%", height: 300 }, [
    h(
      ComposedChart,
      { data: points, margin: { top: 8, right: 8, left: 0, bottom: 0 } },
      [
        grid(),
        dateAxis(),
        h(YAxis, {
          yAxisId: "count",
          tick,
          stroke: GRID,
          width: 52,
          tickFormatter: formatCount,
          ...countDomain(points, trendScale),
        }),
        h(Tooltip, { ...tooltipStyle, formatter: formatTooltipValue }),
        legend,
        eventLine(points, HARVEST_START, "Log harvest begins"),
        eventLine(points, COMPILATION_CUTOVER, "Compilations in production"),
        ...series.map((s) =>
          h(Area, {
            key: s.key,
            yAxisId: "count",
            dataKey: s.key,
            name: s.name,
            stackId: "requests",
            type: "linear",
            stroke: "none",
            fill: s.color,
            fillOpacity: s.fillOpacity,
            connectNulls: false,
            isAnimationActive: false,
          })
        ),
        ...bySalience.flatMap((s) =>
          edgeLines(s, s === organicSeries && organicEstimated)
        ),
        ...overlay,
      ]
    ),
  ]);
}

export function ReferrersChart({ referrers }: { referrers: Referrer[] }) {
  const data = referrers.map((r) => ({
    ...r,
    label: referrerLabel(r.referrer),
  }));
  const height = 24 * data.length + 32;

  return h(ResponsiveContainer, { width: "100%", height }, [
    h(
      BarChart,
      {
        data,
        layout: "vertical",
        margin: { top: 0, right: 16, left: 0, bottom: 0 },
      },
      [
        h(CartesianGrid, { stroke: GRID, horizontal: false }),
        h(XAxis, {
          type: "number",
          tick,
          stroke: GRID,
          tickFormatter: formatCount,
        }),
        h(YAxis, {
          type: "category",
          dataKey: "label",
          tick,
          stroke: GRID,
          width: 180,
          interval: 0,
        }),
        countTooltip(),
        h(Bar, {
          dataKey: "requests",
          name: "Requests",
          fill: SERIES_1,
          barSize: 14,
          radius: [0, 4, 4, 0],
          isAnimationActive: false,
        }),
      ]
    ),
  ]);
}

export function MapSeriesChart({ data }: { data: MapViewsBin[] }) {
  return h(ResponsiveContainer, { width: "100%", height: 200 }, [
    h(AreaChart, { data, margin: { top: 8, right: 8, left: 0, bottom: 0 } }, [
      grid(),
      dateAxis(),
      countAxis(),
      countTooltip(),
      h(Area, {
        dataKey: "requests",
        name: "Requests",
        type: "linear",
        stroke: SERIES_1,
        strokeWidth: 2,
        fill: SERIES_1,
        fillOpacity: 0.25,
        connectNulls: false,
        isAnimationActive: false,
      }),
    ]),
  ]);
}
