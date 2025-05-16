import h from "./main.module.scss";
import { useAPIResult } from "@macrostrat/ui-components";
import { SETTINGS } from "@macrostrat-web/settings";
import { PageHeader, Link, AssistantLinks, DevLinkButton } from "~/components";
import { Card, Icon, Popover, RangeSlider } from "@blueprintjs/core";
import { useState } from "react";
import { ContentPage } from "~/layouts";
import { usePageContext } from 'vike-react/usePageContext';


export function Page() {
    const res = useAPIResult(SETTINGS.apiV2Prefix + "/defs/strat_names?all")?.success.data;

    if (res == null) return h("div", "Loading...");

    const grouped = res.reduce((acc, item) => {
        const { rank, subgp } = item;

        if (!acc[rank]) {
            acc[rank] = {};
        }

        if (!acc[rank][subgp]) {
            acc[rank][subgp] = [];
        }

        acc[rank][subgp].push(item);

        return acc;
    }, {});


    console.log(grouped);

    return h(ContentPage,  [
        h(PageHeader, { title: "Strat Names" }),
        h('div.strat-list',
        Object.entries(grouped).map(([rank, subgps]) =>
            h('div.strat-rank-group', [
            h('h2', `Rank: ${rank}`),
            ...Object.entries(subgps).map(([subgp, items]) =>
                h('div.strat-subgroup', [
                h('h3', `Subgroup: ${subgp.toUpperCase()}`),
                h('div.strat-items',
                    /*
                    items.map(data =>
                        h(StratItem, { data })
                    )
                    */
                )
                ])
            )
            ])
        )
    )
        ])
}

function StratItem({ data }) {
    const { strat_name, rank, subgp, strat_name_id } = data;

    return h('div.strat-name', strat_name)
}

