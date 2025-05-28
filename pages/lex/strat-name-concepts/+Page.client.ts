import h from "./main.module.scss";
import { useAPIResult } from "@macrostrat/ui-components";
import { SETTINGS } from "@macrostrat-web/settings";
import { PageHeader, Link, AssistantLinks, DevLinkButton, LinkCard, PageBreadcrumbs } from "~/components";
import { Card, Icon, Popover, RangeSlider } from "@blueprintjs/core";
import { useState } from "react";
import { ContentPage } from "~/layouts";
import { usePageContext } from 'vike-react/usePageContext';
import { Loading } from "../../index";

export function Page() {
    const [input, setInput] = useState("");
    const res = useAPIResult(SETTINGS.apiV2Prefix + "/defs/strat_name_concepts?all")?.success.data;

    if (res == null) return h(Loading);

    const handleChange = (event) => { 
        setInput(event.target.value.toLowerCase());
    }

    return h(ContentPage, [
        h(PageBreadcrumbs, { title: "Strat Name Concepts" }),
        /*
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
        */
        h('div.strat-list',
           res.map((item) => h(StratItem, { data: item }))
        )
        ])

}

function StratItem({ data }) {
    const { name, concept_id } = data;

    return h(LinkCard, { href: "/lex/strat-name-concepts/" + concept_id }, name)
}

