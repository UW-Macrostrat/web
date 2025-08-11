import h from "./main.module.scss";
import { ErrorBoundary } from "@macrostrat/ui-components";
import {
  Link,
  PageBreadcrumbs,
} from "~/components";
import { ContentPage } from "~/layouts";
import { Timescale } from "@macrostrat/timescale";
import { titleCase } from "~/components/lex";
import { Footer } from "~/components/general";
import { asChromaColor } from "@macrostrat/color-utils";
import { Popover } from "@blueprintjs/core";
import { useData } from "vike-react/useData";
import { LithologyTag } from "@macrostrat/data-components";

export function Page() {
  const { res, intervals, id } = useData();

  // temporary till api is fixed
  const timeRes = res.find((d) => d.timescale_id === id);
  const grouped = groupByIntType(intervals);

  if (timeRes == null) {
    return h(ErrorBoundary, { description: `Timescale #${id} not found` },
      h(Fail, { timeRes })
    );
  }

  const { min_age, max_age, timescale } = timeRes;

  return h("div", [
    h(ContentPage, [
      h(PageBreadcrumbs, { title: "#" + id }),
      h("div.timescale-content", [
        h("h1", titleCase(timescale)),
        h("h3", max_age + " - " + min_age + " Ma"),
        h('div.timescale-container', 
          h(Timescale, {
            length: 970,
            levels: [0, 5],
            ageRange: [min_age, max_age],
            orientation: "horizontal",
            absoluteAgeScale: true,
            onClick: (e, d) => window.open(`/lex/intervals/${d.int_id}`, "_self"),
            className: "timescale",
          }),
        ),
        h(
          "div.int-list",
          Object.entries(grouped).map(([intType, group]) =>
            h("div.int-group", [
              h("h2", UpperCase(intType)),
              h(
                "div.int-items",
                group.map((d) => h(LithologyTag, { data: d, href: `/lex/intervals/${d.int_id}` }))
              ),
            ])
          )
        ),
      ]),
    ]),
    h(Footer),
  ]);
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

function Fail({timeRes}){
  return h('div', timeRes.timescale)
}