/** The columns behind a lexicon item: its map and the Columns card below it.
 *
 * Kept out of the `./index` barrel because `@macrostrat/column-views` can't be
 * loaded server-side; only the client-only item body imports this module.
 */
import h from "./main.module.sass";
import { Spinner } from "@blueprintjs/core";
import { useAPIResult } from "@macrostrat/ui-components";
import { apiV2Prefix } from "@macrostrat-web/settings";
import {
  DataField,
  IntervalTag,
  Parenthetical,
} from "@macrostrat/data-components";
import { AgeField, Duration } from "@macrostrat/column-views";
import { clientOnly } from "./client-only";
import { LexColumnList } from "./column-list";
import { LexMapSettingsBar, LexMapSlot } from "./map-target";
import { Charts, summarize } from "./index";

// NOTE: do NOT statically import "./map.client" here — it pulls in mapbox-gl,
// which touches `window` at module load and crashes SSR. `clientOnly()` dynamic-
// imports it (below) so the barrel stays server-safe.
//
// This local instance is the fallback for consumers *outside* `/lex` (e.g. the
// project column-group page). Lexicon pages pass a `targetKey` and get the
// single shared map instance instead — see `./map-target`.
const LexiconMapLazy = clientOnly(() =>
  import("./map.client").then((m) => m.LexiconMap)
);
export function ColumnsTable({
  resData,
  colData,
  fossilsData,
  mapUrl,
  targetKey = "",
  loading = false,
  showColumnList = false,
}) {
  const hasColumns = colData?.features?.length > 0;
  const summary = summarize(hasColumns ? colData.features : []);

  // Hooks must run unconditionally and in a stable order, ahead of any early
  // return (rules of hooks). `useAPIResult`/`getIntID` no-op on a null route, so
  // pass null when the input is absent instead of skipping the hook.
  const lithLegendIds = useAPIResult(
    resData?.lith_id
      ? apiV2Prefix + "/mobile/map_filter?lith_id=" + resData.lith_id
      : null
  );
  const conceptLegendIds = useAPIResult(
    resData?.concept_id
      ? apiV2Prefix + "/mobile/map_filter?concept_id=" + resData.concept_id
      : null
  );
  const b_interval = useIntervalRecord(summary.b_int_name);
  const t_interval = useIntervalRecord(summary.t_int_name);

  // Nothing to show only once we *know* there are no columns. While they load,
  // fall through and render the frame — that reserves the space and keeps the
  // shared map mounted, so navigation doesn't make it blink out and back.
  if (!hasColumns && !loading) return null;

  let filters = [];

  if (resData?.lith_id && lithLegendIds) {
    filters.push({
      category: "lithology",
      type: "lithologies",
      id: resData.lith_id,
      name: resData.name,
      legend_ids: lithLegendIds,
    });
  }

  if (resData?.concept_id && conceptLegendIds) {
    filters.push({
      category: "strat_name",
      type: "strat_name_concepts",
      id: resData.concept_id,
      name: resData.name,
      legend_ids: conceptLegendIds,
    });
  }

  if (resData?.int_id) {
    filters.push({
      ...resData,
      category: "interval",
      type: "intervals",
      id: resData.int_id,
      name: resData.name,
    });
  }

  // A `targetKey` means the caller is inside `/lex`, where one map instance is
  // mounted by the layout: render the slot it moves into (no map of our own).
  // Everywhere else, mount a local instance as before.
  const mapProps = {
    filters,
    columns: colData,
    className: "column-map-container",
    fossilsData,
    mapUrl,
  };
  let mapElement = null;
  if (targetKey !== "") {
    mapElement = h(LexMapSlot, {
      targetKey,
      loading: !hasColumns,
      ...mapProps,
    });
  } else {
    mapElement = h(LexiconMapLazy, { ...mapProps, fallback: h(Spinner) });
  }

  // The map, then the columns behind it; the map's settings bar is part of its
  // card, beneath whichever instance (shared or local) is above it.
  let columnList = null;
  if (showColumnList && hasColumns) {
    columnList = h(LexColumnList, { colData });
  }
  return h("div.lex-summary", [
    h("div.lex-map-card", [
      mapElement,
      h(LexMapSettingsBar, { mapUrl, hasFilters: filters.length > 0 }),
    ]),
    h(
      ColumnsPanel,
      {
        summary,
        columnCount: colData?.features?.length ?? 0,
        intervals: [b_interval, t_interval],
        loading: !hasColumns,
      },
      [
        h(Charts, { key: "charts", features: colData?.features ?? [] }),
        columnList,
      ]
    ),
  ]);
}

/** Counts as heading-sized fields, the columns' age, extent and thickness as
 * standard data fields, their lithology / environment / economic breakdown,
 * then (on some pages) the columns themselves. While columns load the counts are all zeros, so a placeholder
 * holds the card's shape instead. */
function ColumnsPanel({ summary, columnCount, intervals, loading, children }) {
  if (loading) {
    return h("div.lex-columns-card", [
      h("h2.card-title", "Columns"),
      h("div.stats-loading", h(Spinner, { size: 24 })),
    ]);
  }

  const { t_units, t_sections, b_age, t_age, max_thick, col_area } = summary;

  return h("div.lex-columns-card", [
    h("div.count-fields", [
      h(CountField, { label: "Columns", value: columnCount }),
      h(CountField, { label: "Packages", value: t_sections }),
      h(CountField, { label: "Units", value: t_units }),
    ]),
    h("div.columns-fields", [
      h(AgeField, { unit: { b_age, t_age } }, [
        h(Parenthetical, h(Duration, { value: b_age - t_age })),
        h(IntervalTags, { intervals }),
      ]),
      h(DataField, {
        label: "Area",
        value: Math.round(col_area).toLocaleString(),
        unit: "km²",
      }),
      h(DataField, {
        label: "Max thickness",
        value: max_thick.toLocaleString(),
        unit: "m",
      }),
    ]),
    children,
  ]);
}

function CountField({ label, value }) {
  return h(DataField, {
    className: "count-field",
    label,
    value: value.toLocaleString(),
  });
}

/** The oldest and youngest intervals, once each. */
function IntervalTags({ intervals }) {
  const unique = new Map();
  for (const interval of intervals) {
    if (interval != null) unique.set(interval.id, interval);
  }
  return h(
    "span.interval-tags",
    Array.from(unique.values()).map((interval) =>
      h(IntervalTag, { key: interval.id, interval })
    )
  );
}

/** An interval by name, in the shape `IntervalTag` takes. The columns
 * response names its intervals but carries no ids. */
function useIntervalRecord(name: string) {
  const res = useAPIResult(
    name ? apiV2Prefix + "/defs/intervals?name_like=" + encodeURI(name) : null
  )?.success?.data;

  const d = res?.find((d) => d.name === name);
  if (d == null) return null;
  return {
    id: d.int_id,
    name: d.name,
    b_age: d.b_age,
    t_age: d.t_age,
    color: d.color,
    rank: null,
  };
}
