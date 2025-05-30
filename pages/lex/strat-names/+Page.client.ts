import h from "./main.module.scss";
import { useAPIResult } from "@macrostrat/ui-components";
import { SETTINGS } from "@macrostrat-web/settings";
import { PageHeader, Link, AssistantLinks, DevLinkButton, LinkCard, PageBreadcrumbs } from "~/components";
import { Card, Icon, Popover, RangeSlider } from "@blueprintjs/core";
import { useState } from "react";
import { ContentPage } from "~/layouts";
import { Loading } from "../../index";

export function Page() {
    const [input, setInput] = useState("");
    const [page, setPage] = useState(1);
    const res = useAPIResult(SETTINGS.apiV2Prefix + "/defs/strat_names?strat_name_like=" + input + "&page=" + page)?.success.data;

    if (res == null) return h(Loading);

    const grouped = res.reduce((acc, item) => {
        const { rank, gp, subgp } = item;

        const safeRank = rank ?? 'Unknown';
        const safeGp = gp ?? '';         // Empty string to sort it first
        const safeSubgp = subgp ?? '';   // Same here

        if (!acc[safeRank]) acc[safeRank] = {};
        if (!acc[safeRank][safeGp]) acc[safeRank][safeGp] = {};
        if (!acc[safeRank][safeGp][safeSubgp]) acc[safeRank][safeGp][safeSubgp] = [];

        acc[safeRank][safeGp][safeSubgp].push(item);

        return acc;
    }, {});

    const handleChange = (event) => { 
        setInput(event.target.value.toLowerCase());
    }

    return h(ContentPage, [
        h(PageBreadcrumbs, { title: "Strat Names" }),
        h('div.sift-link', [
            h('p', "This page is is in development."),
            h('a', { href: "/sift/definitions/strat_names", target: "_blank" }, "View in Sift")
        ]),
        h(Card, { className: 'filters'}, [
            h("h2", 'Filter'),
            h('div.search-bar', [
                h(Icon, { icon: "search" }),
                h('input', {
                    type: "text",
                    placeholder: "Filter by name, subgroup, group, or rank...",
                    onChange: handleChange,
                }),
            ])
        ]),
        h('div.strat-list',
            Object.entries(grouped).map(([rank, gps]) =>
            h('div.strat-rank-group', [
                h('h2', `Rank: ${rank}`),

                ...Object.entries(gps).map(([gp, subgps]) =>
                h('div.strat-group', [
                    h('h3', `Group: ${gp}`),

                    ...Object.entries(subgps).map(([subgp, items]) =>
                    h('div.strat-subgroup', [
                        h('h4', `Subgroup: ${subgp.toUpperCase()}`),

                        h('div.strat-items',
                        items.map(data =>
                            h(StratItem, { data })
                        )
                        )
                    ])
                    )
                ])
                )
            ])
            )
        )
        ])

}

function StratItem({ data }) {
    const { strat_name, strat_name_id } = data;

    return h(LinkCard, { href: "/lex/strat-names/" + strat_name_id }, strat_name)
}

