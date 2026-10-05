import h from "./main.module.scss";
import { useState } from "react";
import { useData } from "vike-react/useData";
import { LithologyTag } from "@macrostrat/data-components";
import type { Interval } from "@macrostrat/timescale";
import { clientOnly } from "~/components/lex/client-only";
import { TimescaleChart } from "./timescale-chart";
import { capitalizeWords } from "~/components/lex/timescale-data";

export function Page() {
  const { res, intervals, referenceIntervals, id } = useData();

  // `/defs/timescales` takes no id filter, so the record is found here;
  // `+data.ts` has already 404ed a missing one
  const timeRes = res.find((d) => d.timescale_id === id);
  const [focus, setFocus] = useState<Interval | null>(null);

  const { min_age, max_age, timescale, n_intervals } = timeRes;
  const name = capitalizeWords(timescale);

  return h("div.timescale-content", [
    h("div.timescale-toolbar", [
      h("p.timescale-summary", `${max_age} – ${min_age} Ma · ${n_intervals} intervals`),
      h(FocusTag, { focus, onClear: () => setFocus(null) }),
    ]),
    h("div.timescale-body", [
      h(TimescaleChart, {
        timescaleID: id,
        name,
        intervals,
        referenceIntervals,
        focus,
        onFocus: setFocus,
      }),
      h(IntervalList, { intervals: intervalsWithin(intervals, focus) }),
    ]),
  ]);
}

// `@macrostrat/column-views` can't load server-side, and the tag only appears
// after a click
const AgeWindowTag = clientOnly(() =>
  import("@macrostrat/column-views").then((m) => m.AgeWindowTag)
);

/** The zoomed international interval, as a tag that clears the zoom. */
function FocusTag({ focus, onClear }) {
  if (focus == null) return null;
  // As column-views' `intervalShortFromTimescale`, without importing it here
  const interval = {
    id: focus.int_id ?? focus.oid,
    name: focus.nam,
    color: focus.col,
    b_age: focus.eag,
    t_age: focus.lag,
    rank: focus.lvl,
  };
  return h(AgeWindowTag, { interval, onClear });
}

/** Intervals overlapping the focused one, or all of them. */
function intervalsWithin(intervals: any[], focus: Interval | null) {
  if (focus == null) return intervals;
  return intervals.filter((d) => d.b_age > focus.lag && d.t_age < focus.eag);
}

function IntervalList({ intervals }) {
  const grouped = groupByIntType(intervals);
  return h(
    "div.int-list",
    Object.entries(grouped).map(([intType, group]) =>
      h("div.int-group", [
        h("h2", UpperCase(intType)),
        h(
          "div.int-items",
          group.map((d) =>
            h(LithologyTag, { data: d, href: `/lex/intervals/${d.int_id}` })
          )
        ),
      ])
    )
  );
}

function groupByIntType(items) {
  return items.reduce((acc, item) => {
    const intType = item.int_type?.trim?.();
    if (!intType) return acc; // Skip items with no int_type

    if (!acc[intType]) {
      acc[intType] = [];
    }

    acc[intType].push(item);
    return acc;
  }, {});
}

function UpperCase(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
