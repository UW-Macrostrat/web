import h from "./main.module.scss";
import { useAPIResult } from "@macrostrat/ui-components";
import { SETTINGS } from "@macrostrat-web/settings";
import { PageHeader, Link, AssistantLinks, DevLinkButton } from "~/components";
import { Divider, AnchorButton, Tag, Card, Collapse, Icon } from "@blueprintjs/core";
import { useState } from "react";
import { ContentPage } from "~/layouts";


export function Page() {
    const res = useAPIResult(SETTINGS.apiV2Prefix + "/defs/environments?all")?.success.data;

    if (res == null) return h("div", "Loading...");

    const grouped = groupByClassThenType(res);
    console.log("environments", grouped);

    return h('div.environ-list-page', [
    h(AssistantLinks, [
      h(AnchorButton, [
        h('div.search-bar', [
          h(Icon, { icon: "search" }),
          h('input', {
            type: "text",
            placeholder: "Search environments",
          }),
        ])
      ]),      
    ]),
    h(ContentPage, [
      h(PageHeader, { title: "Environments" }),
        h('div.environment-list',
            Object.entries(grouped).map(([className, types]) =>
                h('div.environment-class-group', [
                h('h2', className),
                ...Object.entries(types).map(([type, group]) =>
                    h('div.environment-group', [
                    h('h3', type),
                    ...group.map(item => EnvironmentItem({ data: item }))
                    ])
                )
                ])
            )
        )
    ])
  ]);
}

function EnvironmentItem({ data }) {
  const { environ_id, name, color } = data;
  return h('div.environ-item', [
    h('div.environ-id', "#" + environ_id),
    h('div.environ-name', { style: { "background-color": color, "color": getContrastTextColor(color)} }, name),
  ]);
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
