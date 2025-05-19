import h from "./main.module.scss";
import { useAPIResult } from "@macrostrat/ui-components";
import { SETTINGS } from "@macrostrat-web/settings";
import { PageHeader, Link, AssistantLinks, DevLinkButton, LinkCard } from "~/components";
import { Card, Icon, Popover, RangeSlider } from "@blueprintjs/core";
import { useState } from "react";
import { ContentPage } from "~/layouts";
import { usePageContext } from 'vike-react/usePageContext';


export function Page() {
    const res = useAPIResult(SETTINGS.apiV2Prefix + "/defs/strat_names?all")?.success.data;
    const [input, setInput] = useState("");

    if (res == null) return h("div", "Loading...");

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

    const filtered = Object.entries(grouped).reduce((acc, [rank, gps]) => {
        const filteredGps = Object.entries(gps).reduce((acc, [gp, subgps]) => {
            const filteredSubgps = Object.entries(subgps).reduce((acc, [subgp, items]) => {
                const filteredItems = items.filter((item) => {
                    const name = item.strat_name?.toLowerCase() || "";
                    const gp = item.gp?.toLowerCase() || "";
                    const subgp = item.subgp?.toLowerCase() || "";
                    const rank = item.rank?.toLowerCase() || "";
                    return name.includes(input) || gp.includes(input) || subgp.includes(input) || rank.includes(input);
                });
                if (filteredItems.length > 0) {
                    acc[subgp] = filteredItems;
                }
                return acc;
            }, {});
            if (Object.keys(filteredSubgps).length > 0) {
                acc[gp] = filteredSubgps;
            }
            return acc;
        }, {});
        if (Object.keys(filteredGps).length > 0) {  
            acc[rank] = filteredGps;
        }
        return acc;
    }, {});

    return h(ContentPage, [
        h(PageHeader, { title: "Strat Names" }),
        h(Card, [
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
            Object.entries(filtered).map(([rank, gps]) =>
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

