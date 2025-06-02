import h from "./main.module.scss";
import { useAPIResult } from "@macrostrat/ui-components";
import { SETTINGS } from "@macrostrat-web/settings";
import { PageBreadcrumbs, AssistantLinks, Link } from "~/components";
import { Card, Icon, Popover, RangeSlider } from "@blueprintjs/core";
import { useState } from "react";
import { ContentPage } from "~/layouts";
import { asChromaColor } from "@macrostrat/color-utils";
import { Loading } from "../../index";
import { PostgrestPage } from "../../PostgrestPage"
import { LinkCard } from "~/components/cards";
import { group } from "console";

export function Page() {
    return h(PostgrestPage, {
        table: "intervals",
        order_col: "id",
        order_col2: "interval_type",
        filter_col: "interval_name",
        pageSize: 50,
        ItemList,
        start: "supereon",
    });
}

function ItemList({ data }) {
  const grouped = data.reduce((acc, item) => {
    const intType = item.interval_type?.trim?.() || "Uncategorized"; // Default to "Uncategorized" if no type
    if (!acc[intType]) {
      acc[intType] = [];
    }
    
    const alreadyExists = acc[intType].some(existing => existing.id === item.id);
    if (!alreadyExists) {
      acc[intType].push(item);
    }

    return acc;
  }, {});

  console.log("Grouped intervals:", grouped);
  return h('div.int-list',
    Object.entries(grouped).map(([intType, group]) =>
      h('div.int-group', [
        h('h2', intType),
        h('div.int-items', group.map((d) => h(Item, { data: d, key: d.environ_id })))
      ])
    )
  )
}

function Item({ data }) {
  const { interval_name, interval_color, abbrev, age_bottom, age_top, id } = data;
  const chromaColor = interval_color ? asChromaColor(interval_color) : null;
  const luminance = .9;

  return h(Popover, {
    className: "int-item-popover",
    content: h('div.int-tooltip', [
        h('div.int-tooltip-id', "ID: #" + id),
        h('div.int-tooltip-ages', age_bottom + " - " + age_top + " Ma"),
        abbrev ? h('div.int-tooltip-abbrev', "Abbreviation - " + abbrev) : null,
        h(Link, { href: "/lex/intervals/" + id }, "View details")
      ]),
    }, 
    h('div.int-item', [
      h('div.int-name', { style: { "backgroundColor": chromaColor?.luminance(1 - luminance).hex(), "color": chromaColor?.luminance(luminance).hex()} }, interval_name),
    ])
  )
}