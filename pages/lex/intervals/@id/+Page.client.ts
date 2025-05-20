import "./main.scss";
import h from "@macrostrat/hyper";
import { useAPIResult } from "@macrostrat/ui-components";
import { SETTINGS } from "@macrostrat-web/settings";
import { PageHeader, Link, AssistantLinks, DevLinkButton, PageBreadcrumbs } from "~/components";
import { Card, Icon, Popover, Divider, RangeSlider } from "@blueprintjs/core";
import { ContentPage } from "~/layouts";
import { usePageContext } from 'vike-react/usePageContext';
import { titleCase } from "../../index";
import { ColumnMap, SiftLink } from "../../../index";
import { navigate } from "vike/client/router";
import { useState, useCallback } from "react";

export function Page() {
    const pageContext = usePageContext();
    const id = parseInt(pageContext.urlParsed.pathname.split("/")[3]);
    const intRes = useAPIResult(SETTINGS.apiV2Prefix + "/defs/intervals?int_id=" + id)?.success.data[0];
    const fossilRes = useAPIResult(SETTINGS.apiV2Prefix + "/fossils?int_id=" + id)?.success.data;
    const [selectedUnitID, setSelectedUnitID] = useState(null);

    /*
    const onSelectColumn = useCallback(
        (col_id: number) => {
        // do nothing
        // We could probably find a more elegant way to do this
        setSelectedUnitID(null);
        navigate(`/columns/${col_id}`, {
            overwriteLastHistoryEntry: true,
        });
        },
        [setSelectedUnitID]
    );
    */

    const onSelectColumn = (e) => {
        console.log("selected", e)
    }

    if (!intRes || !fossilRes) return h("div", "Loading...");

    const { name, color, abbrev, b_age, int_id, t_age, timescales, int_type } = intRes;

    return h(ContentPage, { className: 'int-page'}, [
        h(PageBreadcrumbs, { title: "#" + int_id }),
        h('div.int-header', [
            h('div.int-names', [
                h('div.int-name', { style: { "backgroundColor": color, "color": getContrastTextColor(color)} }, name),
                abbrev ? h('div.int-abbrev', [
                    h('p', " aka "),
                    h('div.int-abbrev-item', { style: { "backgroundColor": color, "color": getContrastTextColor(color)} }, abbrev)
                ]) : null,
            ]),
            h('div.sift-link', [
                h('p', "This page is is in development."),
                h('a', { href: "/sift/interval" + int_id, target: "_blank" }, "View in Sift")
            ]),
        ]),
        h('div.table', [
            h('div.table-content', [
                h('div.int-type', "Type: " + UpperCase(int_type)),
                h('div.int-age', b_age + " - " + t_age + " Ma"),
            ]),
            h(Map, { id: int_id, onSelectColumn }),
        ]),
        timescales[0].name ? h('div.int-timescales', [
            h('h3', "Timescales"),
            h('ul', timescales.map((t) => h('li', h(Link, { href: "/lex/timescales/" + t.timescale_id}, titleCase(t.name))))),
        ]) : null,
        h(References, { id: int_id }),
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

function References({ id }) {
    const res1 = useAPIResult(SETTINGS.apiV2Prefix + "/columns?int_id=" + id)?.success;
    const res2 = useAPIResult(SETTINGS.apiV2Prefix + "/fossils?int_id=" + id)?.success;

    if (res1 == null || res2 == null) return h("div", "Loading...");

    const refArray1 = Object.values(res1.refs);
    const refArray2 = Object.values(res2.refs);
    const refs = [...refArray1, ...refArray2];

    return h('div.int-references', [
        h('h3', "Primary Sources"),
        h(Divider),
        h('ol.ref-list', refs.map((r) => h('li.ref-item', r))),
    ]);
}

function Map({id, onSelectColumn}) {
    const data = useAPIResult(SETTINGS.apiV2Prefix + "/columns?int_id=" + id + "&response=long&format=geojson")?.success.data;

    if (!data) {
        return h("div", "Loading..."); 
    }

    console.log(data)
    
    return h("div.page-container", [
          h(ColumnMap, {
            className: "column-map",
            inProcess: true,
            projectID: null,
            selectedColumn: null,
            onSelectColumn,
            columns: data.features,
          }),
        ])
}