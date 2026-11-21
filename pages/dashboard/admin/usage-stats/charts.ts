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
  Bin,
  Bots,
  CacheBin,
  COMPILATION_CUTOVER,
  MapViewsBin,
  Projection,
  Referrer,
  RequestsPoint,
  shownTotal,
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
  strokeDasharray?: string;
}

const organicSeries: SeriesSpec = {
  key: "organic",
  name: "Organic",
  color: SERIES_1,
};
const presumedSeries: SeriesSpec = {
  key: "presumed",
  name: "Presumed bots",
  color: SERIES_3,
  // Inferred, not observed: a broken outline sets it apart from tagged traffic.
  strokeDasharray: "5 3",
};
const knownBotSeries: SeriesSpec = {
  key: "bot",
  name: "Known bots",
  color: SERIES_2,
};

function requestSeries(bots: Bots): SeriesSpec[] {
  if (bots === "exclude") return [organicSeries];
  if (bots === "only") return [presumedSeries, knownBotSeries];
  return [presumedSeries, organicSeries, knownBotSeries];
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

interface ChartPoint extends RequestsPoint {
  l1?: number | null;
  l2?: number | null;
  projected?: number | null;
}

/** A dashed segment from the last full bin's total to the projected one. */
function withProjection(
  points: ChartPoint[],
  projection: Projection | null,
  bots: Bots
): ChartPoint[] {
  if (projection == null) return points;
  const i = points.findIndex((p) => p.date === projection.date);
  if (i < 1) return points;
  const anchor = shownTotal(points[i - 1], bots);
  if (anchor == null) return points;
  const projected = [...points];
  projected[i - 1] = { ...points[i - 1], projected: anchor };
  projected[i] = { ...points[i], projected: projection.value };
  return projected;
}

function projectionLine(bin: Bin) {
  return h(Line, {
    key: "projected",
    yAxisId: "count",
    dataKey: "projected",
    name: `Projected to the full ${bin}`,
    stroke: INK,
    strokeWidth: 2,
    strokeDasharray: "4 3",
    dot: false,
    connectNulls: false,
    isAnimationActive: false,
  });
}

function withCacheRates(
  points: RequestsPoint[],
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

function formatTooltipValue(value: number, _name: string, item: any) {
  if (item?.dataKey === "l1" || item?.dataKey === "l2") {
    return formatPercent(value);
  }
  return formatFullCount(value);
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

/** Requests as stacked areas; with `cache`, hit rates on a right-hand axis. */
export function RequestsChart({
  data,
  bots,
  bin,
  projection = null,
  cache = null,
}: {
  data: RequestsPoint[];
  bots: Bots;
  bin: Bin;
  projection?: Projection | null;
  cache?: CacheBin[] | null;
}) {
  const series = requestSeries(bots);
  const points = withProjection(withCacheRates(data, cache), projection, bots);
  let legend = null;
  if (series.length > 1 || cache != null || projection != null)
    legend = h(Legend, { verticalAlign: "top", height: 28 });
  let projected = null;
  if (projection != null) projected = projectionLine(bin);
  let overlay = [];
  if (cache != null) overlay = cacheOverlay();

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
            stroke: s.color,
            strokeWidth: 2,
            strokeDasharray: s.strokeDasharray,
            fill: s.color,
            fillOpacity: 0.25,
            connectNulls: false,
            isAnimationActive: false,
          })
        ),
        projected,
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
