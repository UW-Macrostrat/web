import h from "./main.module.scss";
import { useData } from "vike-react/useData";
import { LithologyTag } from "@macrostrat/data-components";
import { TimescaleChart } from "./timescale-chart";
import { capitalizeWords } from "~/components/lex/timescale-data";

export function Page() {
  const { res, intervals, referenceIntervals, id } = useData();

  // `/defs/timescales` takes no id filter, so the record is found here;
  // `+data.ts` has already 404ed a missing one
  const timeRes = res.find((d) => d.timescale_id === id);

  const { min_age, max_age, timescale, n_intervals } = timeRes;
  const name = capitalizeWords(timescale);

  return h("div.timescale-content", [
    h("p.timescale-summary", `${max_age} – ${min_age} Ma · ${n_intervals} intervals`),
    h("div.timescale-body", [
      h(TimescaleChart, {
        timescaleID: id,
        name,
        intervals,
        referenceIntervals,
      }),
      h(IntervalList, { intervals }),
    ]),
  ]);
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
