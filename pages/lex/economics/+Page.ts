import h from "./main.module.scss";
import { useAPIResult } from "@macrostrat/ui-components";
import { SETTINGS } from "@macrostrat-web/settings";
import { PageHeader, AssistantLinks } from "~/components";
import { Card, Icon, Popover } from "@blueprintjs/core";
import { useState } from "react";
import { ContentPage } from "~/layouts";


export function Page() {
    const [input, setInput] = useState("");
    const res = useAPIResult(SETTINGS.apiV2Prefix + "/defs/econs?all")?.success.data;

    if (res == null) return h("div", "Loading...");

    console.log(res);

    const handleChange = (event) => { 
        setInput(event.target.value.toLowerCase());
    }

    const filtered = res.filter((d) => {
        const name = d.name.toLowerCase();
        const className = d.class.toLowerCase();
        const type = d.type ? d.type.toLowerCase() : "";
        return name.includes(input) || className.includes(input) || type.includes(input);
    });

    const grouped = groupByClassThenType(filtered);

    return h('div.econ-list-page', [
    h(AssistantLinks, [
      h(Card, [
        h('div.search-bar', [
          h(Icon, { icon: "search" }),
          h('input', {
            type: "text",
            placeholder: "Search economics",
            onChange: handleChange,
          }),
        ])
      ]),      
    ]),
    h(ContentPage, [
      h(PageHeader, { title: "Economics" }),
        h('div.econ-list',
            Object.entries(grouped).map(([className, types]) =>
                h('div.econ-class-group', [
                h('h2', UpperCase(className)),
                ...Object.entries(types).map(([type, group]) =>
                    h('div.econ-group', [
                        h('h3', UpperCase(type)),
                        h('div.econ-items', group.map((d) => h(EconItem, { data: d, key: d.environ_id }))),
                    ])
                )
                ])
            )
        )
    ])
  ]);
}

function EconItem({ data }) {
  const { name, color, econ_id, t_units } = data;

  return h(Popover, {
    className: "econ-item-popover",
    content: h('div.econ-tooltip', [
        h('div.econ-tooltip-id', "ID - #" + econ_id),
        h('div.econ-tooltip-t-unit', "Time Units - " + t_units),
      ]),
    }, 
    h('div.econ-item', [
      h('div.econ-name', { style: { "backgroundColor": color, "color": getContrastTextColor(color)} }, name),
    ])
  )

  return ;
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

function groupByClassThenType(items) {
  return items.reduce((acc, item) => {
    const { class: className, type } = item;

    // Only include items with a valid type (not null, undefined, or empty string)
    if (!type || type.trim() === '') {
      return acc; // Skip this item if it has no valid type
    }

    if (!acc[className]) {
      acc[className] = {};
    }
    if (!acc[className][type]) {
      acc[className][type] = [];
    }

    acc[className][type].push(item);
    return acc;
  }, {});
}

function UpperCase(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}