/** Recharts figures for the usage-stats page. Series colors are CSS variables
 * from main.module.sass, so dark mode picks its own validated steps. */
import hyper from "@macrostrat/hyper";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Bots,
  CacheBin,
  MapViewsBin,
  Referrer,
  RequestsBin,
  formatCount,
  formatFullCount,
  formatPercent,
  referrerLabel,
} from "./api";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

const SERIES_1 = "var(--usage-series-1)";
const SERIES_2 = "var(--usage-series-2)";
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
  key: "organic" | "bot";
  name: string;
  color: string;
}

function requestSeries(bots: Bots): SeriesSpec[] {
  const organic: SeriesSpec = {
    key: "organic",
    name: "Organic",
    color: SERIES_1,
  };
  const bot: SeriesSpec = { key: "bot", name: "Known bots", color: SERIES_2 };
  if (bots === "exclude") return [organic];
  if (bots === "only") return [bot];
  return [organic, bot];
}

/** Marks where the log-dump lineage begins, if the series spans it. */
function harvestStartLine(data: { date: string }[]) {
  if (data.length === 0) return null;
  const first = data[0].date;
  const last = data[data.length - 1].date;
  if (first >= HARVEST_START || last < HARVEST_START) return null;
  const at = data.find((d) => d.date >= HARVEST_START)?.date;
  return h(ReferenceLine, {
    x: at,
    stroke: INK,
    strokeDasharray: "4 4",
    label: {
      value: "Log harvest begins",
      position: "insideTopLeft",
      fill: INK,
      fontSize: 11,
    },
  });
}

export function RequestsChart({
  data,
  bots,
}: {
  data: RequestsBin[];
  bots: Bots;
}) {
  const series = requestSeries(bots);
  let legend = null;
  if (series.length > 1)
    legend = h(Legend, { verticalAlign: "top", height: 28 });

  return h(ResponsiveContainer, { width: "100%", height: 280 }, [
    h(AreaChart, { data, margin: { top: 8, right: 8, left: 0, bottom: 0 } }, [
      grid(),
      dateAxis(),
      countAxis(),
      countTooltip(),
      legend,
      harvestStartLine(data),
      ...series.map((s) =>
        h(Area, {
          key: s.key,
          dataKey: s.key,
          name: s.name,
          stackId: "requests",
          type: "linear",
          stroke: s.color,
          strokeWidth: 2,
          fill: s.color,
          fillOpacity: 0.25,
          connectNulls: false,
          isAnimationActive: false,
        })
      ),
    ]),
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

function hitRate(hits: number | null, misses: number | null): number | null {
  if (hits == null || misses == null) return null;
  const known = hits + misses;
  if (known === 0) return null;
  return hits / known;
}

export function CacheChart({ data }: { data: CacheBin[] }) {
  const rates = data.map((d) => ({
    date: d.date,
    l1: hitRate(d.l1_hits, d.l1_misses),
    l2: hitRate(d.l2_hits, d.l2_misses),
  }));

  return h(ResponsiveContainer, { width: "100%", height: 240 }, [
    h(
      LineChart,
      { data: rates, margin: { top: 8, right: 8, left: 0, bottom: 0 } },
      [
        grid(),
        dateAxis(),
        h(YAxis, {
          tick,
          stroke: GRID,
          width: 52,
          domain: [0, 1],
          tickFormatter: formatPercent,
        }),
        h(Tooltip, {
          ...tooltipStyle,
          formatter: (v: number) => formatPercent(v),
        }),
        h(Legend, { verticalAlign: "top", height: 28 }),
        h(Line, {
          dataKey: "l1",
          name: "Varnish (L1) hit rate",
          stroke: SERIES_1,
          strokeWidth: 2,
          dot: false,
          connectNulls: false,
          isAnimationActive: false,
        }),
        h(Line, {
          dataKey: "l2",
          name: "Tile cache (L2) hit rate, of L1 misses",
          stroke: SERIES_2,
          strokeWidth: 2,
          dot: false,
          connectNulls: false,
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
