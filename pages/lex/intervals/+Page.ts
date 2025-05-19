import h from "./main.module.scss";
import { useAPIResult } from "@macrostrat/ui-components";
import { SETTINGS } from "@macrostrat-web/settings";
import { PageBreadcrumbs, AssistantLinks, Link } from "~/components";
import { Card, Icon, Popover, RangeSlider } from "@blueprintjs/core";
import { useState } from "react";
import { ContentPage } from "~/layouts";

export function Page() {
    const [input, setInput] = useState("");
    const [age, setAge] = useState([0, 4600]);
    const res = useAPIResult(SETTINGS.apiV2Prefix + "/defs/intervals?all")?.success.data;

    if (res == null) return h("div", "Loading...");

    console.log(res);

    const handleChange = (event) => { 
        setInput(event.target.value.toLowerCase());
    }

    const filtered = res.filter((d) => {
        const name = d.name?.toLowerCase() || "";
        const intType = d.int_type?.toLowerCase() || "";
        const abbrev = d.abbrev?.toLowerCase() || "";
        const b_age = d.b_age ? parseInt(d.b_age, 10) : 0; // Convert to number
        const t_age = d.t_age ? parseInt(d.t_age, 10) : 4600; // Convert to number

        // Check if name, intType, abbrev, or age falls within the ranges or input
        const matchesName = name.includes(input);
        const matchesType = intType.includes(input);
        const matchesAbbrev = abbrev.includes(input);
        const matchesAgeRange =
            (!isNaN(b_age) && b_age >= age[0]) &&
            (!isNaN(t_age) && t_age <= age[1]);

        return (matchesName || matchesType || matchesAbbrev) && matchesAgeRange;
    });

    const grouped = groupByIntType(filtered);
    console.log(grouped);

    return h('div.int-list-page', [
    h(ContentPage, [
      h(PageBreadcrumbs, { title: "Intervals" }),
      h(Card, { className: "filters" }, [
        h('h3', "Filters"),
        h('div', [
          h('div.search-bar', [
            h(Icon, { icon: "search" }),
            h('input', {
              type: "text",
              placeholder: "Filter by name, type, or abbreviation...",
              onChange: handleChange,
            }),
          ])
        ]),     
        h('div.age-filter', [
          h('p', "Filter by ages"),
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
      h('div.int-list',
        Object.entries(grouped).map(([intType, group]) =>
          h('div.int-group', [
            h('h2', UpperCase(intType)),
            h('div.int-items', group.map((d) => h(EconItem, { data: d, key: d.environ_id })))
          ])
        )
      )
    ])
  ]);
}

function EconItem({ data }) {
  const { name, color, abbrev, b_age, int_id, t_age, timescales } = data;

  return h(Popover, {
    className: "int-item-popover",
    content: h('div.int-tooltip', [
        h('div.int-tooltip-id', "ID - #" + int_id),
        h('div.int-tooltip-ages', "Ages - " + b_age + " - " + t_age + " Ma"),
        abbrev ? h('div.int-tooltip-abbrev', "Abbreviation - " + abbrev) : null,
        h(Link, { href: "/lex/intervals/" + int_id }, "View more")
      ]),
    }, 
    h('div.int-item', [
      h('div.int-name', { style: { "backgroundColor": color, "color": getContrastTextColor(color)} }, name),
    ])
  )
}

function getContrastTextColor(bgColor) {
  // Remove '#' if present
  const color = bgColor.replace('#', '');

  // Parse r, g, b
  const r = parseInt(color.substr(0, 2), 16);
  const g = parseInt(color.substr(2, 2), 16);
  const b = parseInt(color.substr(4, 2), 16);

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return black or white depending on luminance
  return luminance > 0.6 ? '#000000' : '#FFFFFF';
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