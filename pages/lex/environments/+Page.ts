import h from "./main.module.scss";
import { useAPIResult } from "@macrostrat/ui-components";
import { SETTINGS } from "@macrostrat-web/settings";
import { PageHeader, AssistantLinks, PageBreadcrumbs } from "~/components";
import { Card, Icon, Popover } from "@blueprintjs/core";
import { useState } from "react";
import { ContentPage } from "~/layouts";
import { asChromaColor } from "@macrostrat/color-utils";
import { Loading } from "../../index";

export function Page() {
    const [input, setInput] = useState("");
    const res = useAPIResult(SETTINGS.apiV2Prefix + "/defs/environments?all")?.success.data;

    if (res == null) return h(Loading);

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

    return h(ContentPage, { className: 'environ-list-page'}, [
      h(PageBreadcrumbs, { title: "Environments" }),
      h(Card, [
        h('h3', "Filters"),
        h('div.search-bar', [
          h(Icon, { icon: "search" }),
          h('input', {
            type: "text",
            placeholder: "Search environments...",
            onChange: handleChange,
          }),
        ])
      ]),      
      h('div.environment-list',
          Object.entries(grouped).map(([className, types]) =>
              h('div.environment-class-group', [
              h('h2', UpperCase(className)),
              ...Object.entries(types).map(([type, group]) =>
                  h('div.environment-group', [
                      h('h3', UpperCase(type)),
                      h('div.environment-items', group.map((d) => h(EnvironmentItem, { data: d, key: d.environ_id }))),
                  ])
              )
              ])
          )
      )
    ]);
}

function EnvironmentItem({ data }) {
  const { environ_id, name, color, t_units } = data;

  const chromaColor = asChromaColor(color)

  const luminance = 0.9;

  return h(Popover, {
    className: "environ-item-popover",
    content: h('div.environ-tooltip', [
        h('div.environ-tooltip-id', "ID - #" + environ_id),
        h('div.environ-tooltip-t-unit', "Time Units - " + t_units),
        h('a', { href: `/lex/environments/${environ_id}` }, "View details")
      ]),
    }, 
    h('div.environ-item', [
      h('div.environ-name', { style: { "backgroundColor": chromaColor?.luminance(1 - luminance).hex(), "color": chromaColor?.luminance(luminance).hex()} }, name),
    ])
  )
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