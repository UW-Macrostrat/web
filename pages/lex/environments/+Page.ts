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

    console.log("environments", res);

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
      h('div.environ-table', [
        h('div.environ-header', [
          h('div.environ-id-header', "ID"),
          h('div.environ-name-header', "Name"),
        ]),
        h(Divider),
        res.map((d) => h(EnvronmentItem, { data: d }) ),
        ])
    ])
  ]);
}

function EnvronmentItem({ data, linkPrefix }) {
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
