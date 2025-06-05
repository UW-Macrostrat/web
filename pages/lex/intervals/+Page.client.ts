import h from "./main.module.scss";
import { useAPIResult } from "@macrostrat/ui-components";
import { SETTINGS } from "@macrostrat-web/settings";
import { PageBreadcrumbs, StickyHeader, Link } from "~/components";
import { Card, Popover, RangeSlider } from "@blueprintjs/core";
import { useState } from "react";
import { ContentPage } from "~/layouts";
import { asChromaColor } from "@macrostrat/color-utils";
import { Loading, SearchBar } from "~/components/general";
import { IntervalTag } from "@macrostrat/data-components";

export function Page() {
  const [input, setInput] = useState("");
  const [age, setAge] = useState([0, 4600]);
  const res = useAPIResult(SETTINGS.apiV2Prefix + "/defs/intervals?all")
    ?.success.data;

  if (res == null) return h(Loading);

  console.log(res);

  const handleChange = (e) => {
    setInput(e.toLowerCase());
  };

  const filtered = res.filter((d) => {
    const name = d.name?.toLowerCase() || "";
    const intType = d.int_type?.toLowerCase() || "";
    const abbrev = d.abbrev?.toLowerCase() || "";
    const b_age = d.b_age ? parseInt(d.b_age, 10) : 0;
    const t_age = d.t_age ? parseInt(d.t_age, 10) : 4600;

    const matchesName = name.includes(input);
    const matchesType = intType.includes(input);
    const matchesAbbrev = abbrev.includes(input);
    const matchesAgeRange =
      !isNaN(b_age) && b_age >= age[0] && !isNaN(t_age) && t_age <= age[1];

    return (matchesName || matchesType || matchesAbbrev) && matchesAgeRange;
  });

  const grouped = groupByIntType(filtered);
  console.log(grouped);

  return h("div.int-list-page", [
    h(ContentPage, [
      h(StickyHeader, [
        h(PageBreadcrumbs, { title: "Intervals" }),
        h(Card, { className: "filters" }, [
          h(SearchBar, {
            placeholder: "Filter by name, type, or abbreviation...",
            onChange: handleChange,
          }),
          h("div.age-filter", [
            h("p", "Filter by ages"),
            h(RangeSlider, {
              min: 0,
              max: 4600,
              stepSize: 10,
              labelStepSize: 1000,
              value: [age[0], age[1]],
              onChange: (value) => {
                setAge(value);
              },
            }),
          ]),
        ]),
      ]),
      h(
        "div.int-list",
        Object.entries(grouped).map(([intType, group]) =>
          h("div.int-group", [
            h("h2", UpperCase(intType)),
            h(
              "div.int-items",
              group.map((d) => h(EconItem, { data: d, key: d.environ_id }))
            ),
          ])
        )
      ),
    ]),
  ]);
}

function EconItem({ data }) {
  const { name, color, abbrev, b_age, int_id, t_age, timescales } = data;
  const chromaColor = color ? asChromaColor(color) : null;
  const luminance = 0.9;
  data.id = int_id;

  // return IntervalTag({ showAgeRange: true, interval: data });

  return h(
    Popover,
    {
      className: "int-item-popover",
      content: h("div.int-tooltip", [
        h("div.int-tooltip-id", "ID: #" + int_id),
        h("div.int-tooltip-ages", b_age + " - " + t_age + " Ma"),
        abbrev ? h("div.int-tooltip-abbrev", "Abbreviation - " + abbrev) : null,
        h(Link, { href: "/lex/intervals/" + int_id }, "View details"),
      ]),
    },
    h("div.int-item", [
      h(
        "div.int-name",
        {
          style: {
            backgroundColor: chromaColor?.luminance(1 - luminance).hex(),
            color: chromaColor?.luminance(luminance).hex(),
          },
        },
        name
      ),
    ])
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
