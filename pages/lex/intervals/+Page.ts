import h from "./main.module.scss";
import { useAPIResult } from "@macrostrat/ui-components";
import { SETTINGS } from "@macrostrat-web/settings";
import { PageHeader, AssistantLinks } from "~/components";
import { Card, Icon, Popover } from "@blueprintjs/core";
import { useState } from "react";
import { ContentPage } from "~/layouts";


export function Page() {
    const [input, setInput] = useState("");
    const res = useAPIResult(SETTINGS.apiV2Prefix + "/defs/intervals?all")?.success.data;

    if (res == null) return h("div", "Loading...");

    const handleChange = (event) => { 
        setInput(event.target.value.toLowerCase());
    }

    const filtered = res.filter((d) => {
        const name = d.name.toLowerCase();
        const intType = d.int_type ? d.int_type.toLowerCase() : "";
        const abbrev = d.abbrev ? d.abbrev.toLowerCase() : "";
        const b_age = d.b_age ? d.b_age.toString() : "";
        const t_age = d.t_age ? d.t_age.toString() : "";
        return name.includes(input) || intType.includes(input) || abbrev.includes(input) || b_age.includes(input) || t_age.includes(input);
    });

    const grouped = groupByIntType(filtered);
    console.log(grouped);


    return h('div.int-list-page', [
    h(AssistantLinks, [
      h(Card, [
        h('div.search-bar', [
          h(Icon, { icon: "search" }),
          h('input', {
            type: "text",
            placeholder: "Search interval names",
            onChange: handleChange,
          }),
        ])
      ]),      
    ]),
    h(ContentPage, [
      h(PageHeader, { title: "Intervals" }),
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
        h('div.int-tooltip-ages', "Ages - " + b_age + " to " + t_age),
        abbrev ? h('div.int-tooltip-abbrev', "Abbreviation - " + abbrev) : null,
        timescales[0].timescale_id ?  h('div.int-tooltip-timescales', [
          h('div.int-tooltip-timescales-title', "Timescales"),
          h('ul.int-tooltip-timescales-list', timescales.map((t) => h('li.int-tooltip-timescale', "#" + t.timescale_id + " - " + t.name)))
        ]) : null,
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