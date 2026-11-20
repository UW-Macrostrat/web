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

// Weekly bins keep eight-plus years to a few hundred points.
const rangeBins: Record<TimeRange, Bin> = {
  "30d": "day",
  "90d": "day",
  "1y": "day",
  all: "week",
};

export interface QueryOptions {
  start: string | null;
  bin: Bin;
  bots: Bots;
}

export function queryOptions(range: TimeRange, bots: Bots): QueryOptions {
  const days = rangeDays[range];
  let start: string | null = null;
  if (days != null) {
    const date = new Date(Date.now() - days * 86400000);
    start = date.toISOString().slice(0, 10);
  }
  return { start, bin: rangeBins[range], bots };
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
  organic: number | null;
  bot: number | null;
  new_system: boolean | null;
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
  source_id: number;
  slug: string | null;
  name: string | null;
  scale: string | null;
  requests: number;
  days: number;
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
const full = new Intl.NumberFormat("en-US");

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
