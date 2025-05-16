import h from "./main.module.scss";
import { useAPIResult } from "@macrostrat/ui-components";
import { SETTINGS } from "@macrostrat-web/settings";
import { PageHeader, Link, AssistantLinks, DevLinkButton } from "~/components";
import { Card, Icon, Popover, RangeSlider } from "@blueprintjs/core";
import { useState } from "react";
import { ContentPage } from "~/layouts";
import { usePageContext } from 'vike-react/usePageContext';


export function Page() {
    const pageContext = usePageContext();
    const id = parseInt(pageContext.urlParsed.pathname.split("/")[3]);
    const res = useAPIResult(SETTINGS.apiV2Prefix + "/defs/intervals?int_id=" + id)?.success.data[0];

    if (res == null) return h("div", "Loading...");

    console.log(res);

    const { name, color, abbrev, b_age, int_id, t_age, timescales, int_type } = res;


    return h(ContentPage, [
        h(PageHeader, { title: "Interval #" + int_id }),
        h('div.int-names', [
            h('div.int-name', { style: { "backgroundColor": color, "color": getContrastTextColor(color)} }, name),
            abbrev ? h('p', " aka ") : null,
            abbrev ? h('div.int-abbrev', { style: { "backgroundColor": color, "color": getContrastTextColor(color)} }, abbrev) : null,
        ]),
        h('div.int-item-content', [
            h('div.int-type', "Type: " + UpperCase(int_type)),
            h('div.int-age', b_age + " - " + t_age + " Ma"),
            h('div.int-timescales', [
                h('h3', "Timescales"),
                h('ul', timescales.map((t) => h('li', h(Link, { href: "/timescales/" + t.timescale_id}, t.name)))),
            ]),
        ]),
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

function UpperCase(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}