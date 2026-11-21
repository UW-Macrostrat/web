/** Usage stats: the harvested tileserver request indexes, read through
 * api_v3's admin-only `/usage-stats` routes.
 *
 * Spatial request density is on /heatmap; `tileserver_location_index` has no
 * date, so it does not belong on a page about change over time.
 */
import hyper from "@macrostrat/hyper";
import {
  Callout,
  Card,
  HTMLTable,
  Intent,
  NonIdealState,
  SegmentedControl,
  Spinner,
  Switch,
} from "@blueprintjs/core";
import { Provider, atom, useAtom, useAtomValue, useSetAtom } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import { useEffect, type ReactNode } from "react";
import {
  Bots,
  CacheBin,
  LayerCount,
  MapViews,
  MapViewsBin,
  MapViewsList,
  PipelineStatus,
  Bin,
  QueryOptions,
  Referrers,
  RequestsBin,
  Projection,
  RequestsPoint,
  Result,
  Smoothing,
  SourceInfo,
  ThrottledClient,
  TimeRange,
  binOptions,
  botOptions,
  defaultBin,
  formatAge,
  formatCount,
  formatFullCount,
  formatPercent,
  extendToPresent,
  formatTimestamp,
  partialBin,
  productionMapUrl,
  projectPartialBin,
  queryOptions,
  requestsPoints,
  rollingMean,
  smoothingOptions,
  timeRanges,
  useProductionSources,
  useUsageStats,
} from "./api";
import { MapSeriesChart, ReferrersChart, RequestsChart } from "./charts";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

const DEFAULT_RANGE: TimeRange = "90d";
const DEFAULT_BOTS: Bots = "exclude";
// Matches the CLI's `usage-stats status --max-age` default.
const STALE_HOURS = 3;
const MAPS_SHOWN = 25;

const DEFAULT_SMOOTHING: Smoothing = "none";

const rangeAtom = atom<TimeRange>(DEFAULT_RANGE);
const botsAtom = atom<Bots>(DEFAULT_BOTS);
// Null until chosen, so each range keeps its own default bin.
const chosenBinAtom = atom<Bin | null>(null);
const smoothingAtom = atom<Smoothing>(DEFAULT_SMOOTHING);
const mapAtom = atom<number | null>(null);
const cacheOverlayAtom = atom<boolean>(false);

const binAtom = atom<Bin>(
  (get) => get(chosenBinAtom) ?? defaultBin(get(rangeAtom))
);

const optionsAtom = atom<QueryOptions>((get) =>
  queryOptions(get(rangeAtom), get(botsAtom), get(binAtom), get(smoothingAtom))
);

export function Page() {
  return h(Provider, [h(UrlState), h(UsageStatsPage)]);
}

/** Reads the view from the URL once, then writes it back one way. */
function UrlState() {
  useHydrateAtoms(initialValues());
  const range = useAtomValue(rangeAtom);
  const bots = useAtomValue(botsAtom);
  const bin = useAtomValue(chosenBinAtom);
  const smoothing = useAtomValue(smoothingAtom);
  const map = useAtomValue(mapAtom);
  const cache = useAtomValue(cacheOverlayAtom);

  useEffect(() => {
    const url = new URL(window.location.href);
    setParam(url, "range", range, DEFAULT_RANGE);
    setParam(url, "bots", bots, DEFAULT_BOTS);
    setParam(url, "bin", bin, null);
    setParam(url, "smooth", smoothing, DEFAULT_SMOOTHING);
    setParam(url, "map", map, null);
    setParam(url, "cache", cache, false);
    window.history.replaceState(window.history.state, "", url);
  }, [range, bots, bin, smoothing, map, cache]);

  return null;
}

function initialValues(): [any, any][] {
  const params = new URLSearchParams(window.location.search);
  const values: [any, any][] = [];
  const range = params.get("range");
  if (timeRanges.some((r) => r.value === range))
    values.push([rangeAtom, range]);
  const bots = params.get("bots");
  if (botOptions.some((b) => b.value === bots)) values.push([botsAtom, bots]);
  const bin = params.get("bin");
  if (binOptions.some((b) => b.value === bin))
    values.push([chosenBinAtom, bin]);
  const smooth = params.get("smooth");
  if (smoothingOptions.some((s) => s.value === smooth))
    values.push([smoothingAtom, smooth]);
  const map = Number(params.get("map"));
  if (Number.isInteger(map) && map > 0) values.push([mapAtom, map]);
  if (params.get("cache") === "true") values.push([cacheOverlayAtom, true]);
  return values;
}

function setParam(url: URL, key: string, value: any, defaultValue: any) {
  if (value == null || value === defaultValue) {
    url.searchParams.delete(key);
    return;
  }
  url.searchParams.set(key, String(value));
}

function UsageStatsPage() {
  return h("div.usage-page", [
    h(HarvesterStatus),
    h(Controls),
    h(RequestsSection),
    h(ThrottledSection),
    h(ReferrersSection),
    h(LayersSection),
    h(MapsSection),
  ]);
}

function Section({
  title,
  description = null,
  children,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return h("section.usage-section", [
    h("div.section-header", [
      h("h2", title),
      h.if(description != null)("p.muted", description),
    ]),
    children,
  ]);
}

/** A spinner, an error, or the rendered content. */
function loaded<T>(result: Result<T>, render: (data: T) => ReactNode) {
  if (result.error != null) {
    return h(
      Callout,
      { intent: Intent.DANGER, title: "Couldn't load" },
      result.error
    );
  }
  if (result.data == null) return h("div.loading", h(Spinner, { size: 24 }));
  return h([render(result.data)]);
}

function HarvesterStatus() {
  const result = useUsageStats<PipelineStatus[]>("/status");
  return loaded(result, (rows) => {
    const tiles = rows.find((r) => r.pipeline === "tileserver");
    if (tiles == null) {
      return h(
        Callout,
        { intent: Intent.WARNING },
        "The tileserver pipeline has never run."
      );
    }
    const ageHours =
      (Date.now() - new Date(tiles.last_run).getTime()) / 3600000;
    let intent: Intent = Intent.NONE;
    let icon = "tick-circle";
    if (ageHours > STALE_HOURS) {
      intent = Intent.WARNING;
      icon = "warning-sign";
    }
    return h(Callout, { intent, icon, className: "harvester-status" }, [
      h("strong", "Log harvester: "),
      `last capture ${formatAge(tiles.last_run)}, newest log ${formatAge(
        tiles.newest_log
      )}, `,
      `${formatFullCount(tiles.n_objects)} log objects read.`,
    ]);
  });
}

function Controls() {
  const [range, setRange] = useAtom(rangeAtom);
  const [bots, setBots] = useAtom(botsAtom);
  const bin = useAtomValue(binAtom);
  const setBin = useSetAtom(chosenBinAtom);
  const [smoothing, setSmoothing] = useAtom(smoothingAtom);

  let smoothingControl = null;
  if (bin === "day") {
    smoothingControl = h(SegmentedControl, {
      options: smoothingOptions,
      value: smoothing,
      onValueChange: (value: Smoothing) => setSmoothing(value),
    });
  }

  return h("div.controls", [
    h(SegmentedControl, {
      options: timeRanges,
      value: range,
      onValueChange: (value: TimeRange) => setRange(value),
    }),
    h(SegmentedControl, {
      options: botOptions,
      value: bots,
      onValueChange: (value: Bots) => setBots(value),
    }),
    h(SegmentedControl, {
      options: binOptions,
      value: bin,
      onValueChange: (value: Bin) => setBin(value),
    }),
    smoothingControl,
  ]);
}

/** "per day, 7-day mean": what each point of a series is. */
function seriesUnit({ bin, window }: QueryOptions): string {
  if (window > 1) return `per ${bin}, ${window}-day mean`;
  return `per ${bin}`;
}

function RequestsSection() {
  const options = useAtomValue(optionsAtom);
  const { start, bin, bots, window } = options;
  const result = useUsageStats<RequestsBin[]>("/tiles/requests", {
    start,
    bin,
  });
  const status = useUsageStats<PipelineStatus[]>("/status");
  const newestLog =
    status.data?.find((r) => r.pipeline === "tileserver")?.newest_log ?? null;
  return h(
    Section,
    {
      title: "Tile requests",
      description: `Requests ${seriesUnit(
        options
      )}. Known bots are clients identified by address or hourly volume. Presumed bots are the overage during phases that peak above five times the long-term trend.`,
    },
    loaded(result, (data) => {
      const points = extendToPresent(requestsPoints(data), bin);
      const projection = projectPartialBin(
        points,
        partialBin(newestLog, bin),
        bots
      );
      return [
        h(RequestTotals, { data: points, bots }),
        h(CacheOverlayToggle),
        h(RequestsFigure, {
          data: rollingMean(points, ["organic", "presumed", "bot"], window),
          projection,
        }),
      ];
    })
  );
}

function CacheOverlayToggle() {
  const [checked, setChecked] = useAtom(cacheOverlayAtom);
  return h(Switch, {
    className: "chart-options",
    label: "Cache hit rates (right axis)",
    checked,
    onChange: (event) => setChecked(event.currentTarget.checked),
  });
}

function RequestsFigure({
  data,
  projection,
}: {
  data: RequestsPoint[];
  projection: Projection | null;
}) {
  const overlay = useAtomValue(cacheOverlayAtom);
  const { start, bin, bots, window } = useAtomValue(optionsAtom);
  let path: string | null = null;
  if (overlay) path = "/tiles/cache";
  const result = useUsageStats<CacheBin[]>(path, { start, bin, bots });
  const chart = { data, bots, bin, projection };
  if (!overlay) return h(RequestsChart, chart);
  // Smoothing the counts, not the rates, weights each day by its traffic.
  const keys: (keyof CacheBin)[] = [
    "l1_hits",
    "l1_misses",
    "l2_hits",
    "l2_misses",
  ];
  return loaded(result, (cache) =>
    h(RequestsChart, { ...chart, cache: rollingMean(cache, keys, window) })
  );
}

function RequestTotals({ data, bots }: { data: RequestsPoint[]; bots: Bots }) {
  const organic = sum(data.map((d) => d.organic));
  const presumed = sum(data.map((d) => d.presumed));
  const known = sum(data.map((d) => d.bot));
  const total = organic + presumed + known;
  let shown = organic;
  if (bots === "include") shown = total;
  if (bots === "only") shown = presumed + known;
  return h("div.stat-tiles", [
    h(StatTile, { label: "Requests", value: formatCount(shown) }),
    h(StatTile, {
      label: "Known bots",
      value: formatPercent(known / total),
    }),
    h(StatTile, {
      label: "Presumed bots",
      value: formatPercent(presumed / total),
    }),
  ]);
}

function StatTile({ label, value }: { label: string; value: string }) {
  return h(Card, { className: "stat-tile" }, [
    h("div.stat-value", value),
    h("div.stat-label", label),
  ]);
}

function ReferrersSection() {
  const { start, bots } = useAtomValue(optionsAtom);
  const result = useUsageStats<Referrers>("/tiles/referrers", {
    start,
    bots,
    limit: 15,
  });
  return h(
    Section,
    {
      title: "Who embeds our tiles",
      description:
        "Host of the Referer header. Requests with none come from apps, scripts and direct use.",
    },
    loaded(result, (data) => [
      h("p.muted", [
        `${formatFullCount(data.n_referrers)} referring hosts; the top `,
        `${data.referrers.length} are shown.`,
      ]),
      h(ReferrersChart, { referrers: data.referrers }),
    ])
  );
}

function ThrottledSection() {
  const { start } = useAtomValue(optionsAtom);
  const result = useUsageStats<ThrottledClient[]>("/tiles/throttled", {
    start,
  });
  return h(
    Section,
    {
      title: "Throttled clients",
      description:
        "Clients over the tile cache's render limit, most recent first. Cached tiles are still served to them.",
    },
    loaded(result, (rows) => h(ThrottledTable, { rows }))
  );
}

const throttleActions: Record<string, string> = {
  deny: "Refused",
  "would-deny": "Would refuse (report mode)",
};

function ThrottledTable({ rows }: { rows: ThrottledClient[] }) {
  if (rows.length === 0) {
    return h(NonIdealState, {
      icon: "tick-circle",
      title: "No client reached the render limit in this range",
    });
  }
  return h(HTMLTable, { compact: true, className: "usage-table" }, [
    h(
      "thead",
      h("tr", [
        h("th", "Client"),
        h("th", "Action"),
        h("th.num", "Requests"),
        h("th.num", "Days"),
        h("th", "First seen"),
        h("th", "Last seen"),
      ])
    ),
    h(
      "tbody",
      rows.map((r) =>
        h("tr", { key: `${r.client}.${r.action}` }, [
          h("td", h("code", r.client)),
          h("td", throttleActions[r.action] ?? r.action),
          h("td.num", formatFullCount(r.requests)),
          h("td.num", r.days),
          h("td", formatTimestamp(r.first_seen)),
          h("td", formatTimestamp(r.last_seen)),
        ])
      )
    ),
  ]);
}

function LayersSection() {
  const { start, bots } = useAtomValue(optionsAtom);
  const result = useUsageStats<LayerCount[]>("/tiles/layers", { start, bots });
  return h(
    Section,
    { title: "Layers" },
    loaded(result, (rows) => h(LayersTable, { rows }))
  );
}

function LayersTable({ rows }: { rows: LayerCount[] }) {
  const total = sum(rows.map((r) => r.requests));
  return h(HTMLTable, { compact: true, className: "usage-table" }, [
    h(
      "thead",
      h("tr", [
        h("th", "Layer"),
        h("th", "Format"),
        h("th.num", "Requests"),
        h("th.num", "Share"),
      ])
    ),
    h(
      "tbody",
      rows.map((r) =>
        h("tr", { key: `${r.layer}.${r.ext}` }, [
          h("td", r.layer),
          h("td", r.ext || "—"),
          h("td.num", formatFullCount(r.requests)),
          h("td.num", formatPercent(r.requests / total)),
        ])
      )
    ),
  ]);
}

function MapsSection() {
  const { start, bots } = useAtomValue(optionsAtom);
  const result = useUsageStats<MapViewsList>("/tiles/maps", {
    start,
    bots,
    limit: MAPS_SHOWN,
  });
  return h(
    Section,
    {
      title: "Views per map",
      description:
        "Requests whose tiles drew each map. A tile credits every map it draws, so the counts overlap.",
    },
    loaded(result, (data) => h(MapsPanel, { data }))
  );
}

function MapsPanel({ data }: { data: MapViewsList }) {
  const sources = useProductionSources(data.maps.map((m) => m.source_id));
  if (data.maps.length === 0) {
    return h(NonIdealState, {
      icon: "map",
      title: "No map attribution in this range",
      description: "Tiles name their maps only since the compilation cutover.",
    });
  }
  return h("div.maps-panel", [
    h("p.muted", [
      `${formatFullCount(data.n_maps)} maps viewed between ${
        data.first_date
      } and `,
      `${data.last_date}. Choose one to see it over time.`,
    ]),
    h(SelectedMapChart, { sources }),
    h(MapsTable, { maps: data.maps, sources }),
  ]);
}

type Sources = Record<number, SourceInfo> | null;

function SelectedMapChart({ sources }: { sources: Sources }) {
  const map = useAtomValue(mapAtom);
  const options = useAtomValue(optionsAtom);
  const { start, bin, bots, window } = options;
  let path: string | null = null;
  if (map != null) path = `/tiles/maps/${map}`;
  const result = useUsageStats<MapViewsBin[]>(path, { start, bin, bots });
  if (map == null) return null;
  const title = sources?.[map]?.name ?? `Source ${map}`;
  return h("div.map-series", [
    h("h3", `${title} · requests ${seriesUnit(options)}`),
    loaded(result, (data) =>
      h(MapSeriesChart, {
        data: rollingMean(extendToPresent(data, bin), ["requests"], window),
      })
    ),
  ]);
}

function MapsTable({ maps, sources }: { maps: MapViews[]; sources: Sources }) {
  const [selected, setSelected] = useAtom(mapAtom);
  return h(
    HTMLTable,
    { compact: true, interactive: true, className: "usage-table" },
    [
      h(
        "thead",
        h("tr", [
          h("th", "Map"),
          h("th", "Scale"),
          h("th.num", "Requests"),
          h("th.num", "Days"),
        ])
      ),
      h(
        "tbody",
        maps.map((m) =>
          h(
            "tr",
            {
              key: m.source_id,
              className: rowClass(m.source_id === selected),
              onClick: () => setSelected(m.source_id),
            },
            [
              h("td", h(MapLabel, { map: m, source: sources?.[m.source_id] })),
              h("td", sources?.[m.source_id]?.scale ?? "—"),
              h("td.num", formatFullCount(m.requests)),
              h("td.num", m.days),
            ]
          )
        )
      ),
    ]
  );
}

function rowClass(selected: boolean): string | undefined {
  if (selected) return styles["selected-row"];
  return undefined;
}

function MapLabel({ map, source }: { map: MapViews; source?: SourceInfo }) {
  let name = h("span.muted", `Source ${map.source_id}`);
  if (source != null) name = h("span", source.name);
  return h("span", [
    h(
      "a",
      { href: productionMapUrl(map.source_id), onClick: stopPropagation },
      name
    ),
    h("span.muted", ` · ${map.source_id}`),
  ]);
}

function stopPropagation(event: { stopPropagation: () => void }) {
  event.stopPropagation();
}

function sum(values: (number | null)[]): number {
  return values.reduce<number>((acc, v) => acc + (v ?? 0), 0);
}
