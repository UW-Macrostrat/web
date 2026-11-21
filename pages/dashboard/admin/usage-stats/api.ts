/** api_v3's admin-only `/usage-stats` routes, and the page's view options. */
import { apiV3Prefix } from "@macrostrat-web/settings";
import { useEffect, useState } from "react";

export type TimeRange = "30d" | "90d" | "1y" | "all";
export type Bots = "exclude" | "include" | "only";
export type Bin = "day" | "week" | "month";

export const timeRanges: { value: TimeRange; label: string }[] = [
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "1y", label: "1 year" },
  { value: "all", label: "All time" },
];

export const botOptions: { value: Bots; label: string }[] = [
  { value: "exclude", label: "Organic" },
  { value: "include", label: "All" },
  { value: "only", label: "Bots only" },
];

const rangeDays: Record<TimeRange, number | null> = {
  "30d": 30,
  "90d": 90,
  "1y": 365,
  all: null,
};

export type Smoothing = "none" | "7d" | "30d";

export const binOptions: { value: Bin; label: string }[] = [
  { value: "day", label: "Daily" },
  { value: "week", label: "Weekly" },
  { value: "month", label: "Monthly" },
];

export const smoothingOptions: { value: Smoothing; label: string }[] = [
  { value: "none", label: "Raw" },
  { value: "7d", label: "7-day mean" },
  { value: "30d", label: "30-day mean" },
];

const smoothingWindows: Record<Smoothing, number> = {
  none: 1,
  "7d": 7,
  "30d": 30,
};

// Until a bin is chosen; weekly keeps eight-plus years to a few hundred points.
const rangeBins: Record<TimeRange, Bin> = {
  "30d": "day",
  "90d": "day",
  "1y": "day",
  all: "week",
};

export function defaultBin(range: TimeRange): Bin {
  return rangeBins[range];
}

export interface QueryOptions {
  start: string | null;
  bin: Bin;
  bots: Bots;
  /** Rolling-mean window in bins; 1 when not smoothing. */
  window: number;
}

export function queryOptions(
  range: TimeRange,
  bots: Bots,
  bin: Bin,
  smoothing: Smoothing
): QueryOptions {
  const days = rangeDays[range];
  let start: string | null = null;
  if (days != null) {
    const date = new Date(Date.now() - days * 86400000);
    start = date.toISOString().slice(0, 10);
  }
  let window = 1;
  if (bin === "day") window = smoothingWindows[smoothing];
  return { start, bin, bots, window };
}

/** Centered rolling mean over the bins present in each window, as the CLI's
 * `plot` computes it. Empty bins stay null, so outages still draw as gaps. */
export function rollingMean<T extends object>(
  rows: T[],
  keys: (keyof T)[],
  window: number
): T[] {
  if (window <= 1) return rows;
  const before = Math.floor(window / 2);
  const after = window - before - 1;
  return rows.map((row, i) => {
    const smoothed: any = { ...row };
    for (const key of keys) {
      if (row[key] == null) continue;
      let total = 0;
      let n = 0;
      const last = Math.min(rows.length - 1, i + after);
      for (let j = Math.max(0, i - before); j <= last; j++) {
        const value = rows[j][key] as number | null;
        if (value == null) continue;
        total += value;
        n += 1;
      }
      smoothed[key] = total / n;
    }
    return smoothed;
  });
}

const DAY_MS = 86400000;

function dayMs(date: string): number {
  return Date.parse(`${date}T00:00:00Z`);
}

function dayString(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Start of the UTC bin holding `ms`, as the API's `date_trunc` bins. */
function binStart(ms: number, bin: Bin): number {
  const d = new Date(ms);
  const day = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  if (bin === "week") return day - ((d.getUTCDay() + 6) % 7) * DAY_MS;
  if (bin === "month") return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
  return day;
}

function nextBin(ms: number, bin: Bin): number {
  const d = new Date(ms);
  if (bin === "week") return ms + 7 * DAY_MS;
  if (bin === "month")
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
  return ms + DAY_MS;
}

/** Empty bins after the last row, through the bin holding the present. */
export function extendToPresent<T extends { date: string }>(
  rows: T[],
  bin: Bin
): T[] {
  if (rows.length === 0) return rows;
  const end = binStart(Date.now(), bin);
  const extended = [...rows];
  let next = nextBin(dayMs(rows[rows.length - 1].date), bin);
  while (next <= end) {
    extended.push({ date: dayString(next) } as T);
    next = nextBin(next, bin);
  }
  return extended;
}

export interface PartialBin {
  date: string;
  /** Share of the bin the harvested logs cover, between 0 and 1. */
  covered: number;
}

/** The bin the newest harvested log falls in, unless the logs cover all of it. */
export function partialBin(
  newestLog: string | null,
  bin: Bin
): PartialBin | null {
  if (newestLog == null) return null;
  const at = Date.parse(newestLog);
  const start = binStart(at, bin);
  const covered = (at - start) / (nextBin(start, bin) - start);
  if (covered <= 0 || covered >= 1) return null;
  return { date: dayString(start), covered };
}

export interface PipelineStatus {
  pipeline: string;
  n_objects: number;
  n_matched: number | null;
  last_run: string | null;
  newest_log: string | null;
}

export interface RequestsBin {
  date: string;
  /** Untagged requests, presumed bots included. */
  organic: number | null;
  bot: number | null;
  /** The part of `organic` on spike days above its local baseline. */
  presumed_bot?: number | null;
  new_system: boolean | null;
}

/** A requests bin with organic split from presumed bots, for charting. */
export interface RequestsPoint {
  date: string;
  organic: number | null;
  presumed: number | null;
  bot: number | null;
}

const shownKeys: Record<Bots, ("organic" | "presumed" | "bot")[]> = {
  exclude: ["organic"],
  include: ["organic", "presumed", "bot"],
  only: ["presumed", "bot"],
};

/** The sum of the series a bots option shows; null when all are empty. */
export function shownTotal(point: RequestsPoint, bots: Bots): number | null {
  let total: number | null = null;
  for (const key of shownKeys[bots]) {
    const value = point[key];
    if (value != null) total = (total ?? 0) + value;
  }
  return total;
}

export interface Projection {
  date: string;
  /** The shown total scaled up to the whole bin. */
  value: number;
}

export function projectPartialBin(
  points: RequestsPoint[],
  partial: PartialBin | null,
  bots: Bots
): Projection | null {
  if (partial == null) return null;
  const point = points.find((p) => p.date === partial.date);
  if (point == null) return null;
  const total = shownTotal(point, bots);
  if (total == null) return null;
  return { date: partial.date, value: total / partial.covered };
}

export function requestsPoints(data: RequestsBin[]): RequestsPoint[] {
  return data.map((d) => {
    const presumed = d.presumed_bot ?? null;
    let organic = d.organic;
    if (organic != null) organic -= presumed ?? 0;
    return { date: d.date, organic, presumed, bot: d.bot };
  });
}

export interface Referrer {
  referrer: string;
  requests: number;
  days: number;
  first_seen: string;
  last_seen: string;
}

export interface Referrers {
  total_requests: number;
  n_referrers: number;
  referrers: Referrer[];
}

export interface CacheBin {
  date: string;
  requests: number | null;
  l1_hits: number | null;
  l1_misses: number | null;
  l2_hits: number | null;
  l2_misses: number | null;
}

export interface LayerCount {
  layer: string;
  ext: string;
  requests: number;
}

export interface MapViews {
  /** A production source id, whichever environment the page runs in. */
  source_id: number;
  requests: number;
  days: number;
}

export interface ThrottledClient {
  /** An IPv4 address or an IPv6 /64, as the tile cache keys it. */
  client: string;
  action: "deny" | "would-deny" | string;
  requests: number;
  days: number;
  first_seen: string;
  last_seen: string;
}

// The harvester reads production logs everywhere, so map ids are production's.
const productionSite = "https://macrostrat.org";

/** The day compilations replaced the legacy carto build in production. */
export const COMPILATION_CUTOVER = "2026-11-03";

export function productionMapUrl(sourceId: number): string {
  return `${productionSite}/maps/${sourceId}`;
}

export interface SourceInfo {
  source_id: number;
  name: string;
  scale: string | null;
}

/** Names and scales of production map sources, by id; null while loading. */
export function useProductionSources(
  ids: number[]
): Record<number, SourceInfo> | null {
  const key = ids.join(",");
  const [sources, setSources] = useState<Record<number, SourceInfo> | null>(
    null
  );

  useEffect(() => {
    if (key === "") return;
    let cancelled = false;
    setSources(null);
    fetchProductionSources(key)
      .then((rows) => {
        if (!cancelled) setSources(rows);
      })
      .catch(() => {
        if (!cancelled) setSources({});
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return sources;
}

async function fetchProductionSources(
  ids: string
): Promise<Record<number, SourceInfo>> {
  const url = `${productionSite}/api/v2/defs/sources?source_id=${ids}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status}`);
  const body = await response.json();
  const rows: SourceInfo[] = body?.success?.data ?? [];
  return Object.fromEntries(rows.map((r) => [r.source_id, r]));
}

export interface MapViewsList {
  n_maps: number;
  first_date: string | null;
  last_date: string | null;
  maps: MapViews[];
}

export interface MapViewsBin {
  date: string;
  requests: number | null;
}

export interface Result<T> {
  data: T | null;
  error: string | null;
}

/** GET a usage-stats route with the session cookie; `null` params are dropped. */
export function useUsageStats<T>(
  path: string | null,
  params: Record<string, string | number | null> = {}
): Result<T> {
  const query = searchString(params);
  const [result, setResult] = useState<Result<T>>({ data: null, error: null });

  useEffect(() => {
    if (path == null) return;
    let cancelled = false;
    setResult({ data: null, error: null });
    fetchUsageStats<T>(`${path}${query}`)
      .then((data) => {
        if (!cancelled) setResult({ data, error: null });
      })
      .catch((err) => {
        if (!cancelled) setResult({ data: null, error: String(err.message) });
      });
    return () => {
      cancelled = true;
    };
  }, [path, query]);

  return result;
}

async function fetchUsageStats<T>(path: string): Promise<T> {
  const response = await fetch(`${apiV3Prefix}/usage-stats${path}`, {
    credentials: "include",
  });
  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`;
    try {
      const body = await response.json();
      if (body?.detail != null) detail = String(body.detail);
    } catch {}
    throw new Error(detail);
  }
  return response.json();
}

function searchString(params: Record<string, string | number | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value != null) search.set(key, String(value));
  }
  const query = search.toString();
  if (query === "") return "";
  return `?${query}`;
}

const compact = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const full = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export function formatCount(value: number | null | undefined): string {
  if (value == null) return "—";
  return compact.format(value);
}

export function formatFullCount(value: number | null | undefined): string {
  if (value == null) return "—";
  return full.format(value);
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

/** Compact relative age: "3 min", "4 h", "2 d". */
const timestamp = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function formatTimestamp(iso: string | null): string {
  if (iso == null) return "—";
  return timestamp.format(new Date(iso));
}

export function formatAge(iso: string | null): string {
  if (iso == null) return "never";
  const seconds = (Date.now() - new Date(iso).getTime()) / 1000;
  if (seconds < 90) return `${Math.round(seconds)} s ago`;
  if (seconds < 5400) return `${Math.round(seconds / 60)} min ago`;
  if (seconds < 172800) return `${Math.round(seconds / 3600)} h ago`;
  return `${Math.round(seconds / 86400)} d ago`;
}

export function referrerLabel(referrer: string): string {
  if (referrer === "") return "(no referrer)";
  return referrer;
}
