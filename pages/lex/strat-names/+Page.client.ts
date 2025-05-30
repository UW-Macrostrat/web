import h from "./main.module.scss";
import { useAPIResult, InfiniteScroll, LoadingPlaceholder } from "@macrostrat/ui-components";
import { SETTINGS } from "@macrostrat-web/settings";
import { PageHeader, Link, AssistantLinks, DevLinkButton, LinkCard, PageBreadcrumbs } from "~/components";
import { Card, Icon, Spinner, RangeSlider } from "@blueprintjs/core";
import { useState, useEffect } from "react";
import { ContentPage } from "~/layouts";
import { Loading } from "../../index";

export function Page() {
    const [input, setInput] = useState("");
    const [lastID, setLastID] = useState(0);
    const [data, setData] = useState([]);
    const result = useStratData(lastID, input);

    useEffect(() => {
        if (result) {
            setData(prevData => [...prevData, ...result]);
        }
    }, [result]);

    useEffect(() => {
        // Example: Reset data if lastID changes
        setData([]);
    }, [input]);


    if (data == null) return h(Loading);

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
            h('div.strat-items',
                data.map(data =>
                    h(StratItem, { data })
                )
            )
        ),
        h('div.page-loader-container', [
            h('h4', {
                onClick: () => {
                    setLastID(data.length > 0 ? data[data.length - 1].strat_name_id : lastID);
                }
            }, "Load More"),
        ])
    ]);          
}

function StratItem({ data }) {
    const { strat_name, strat_name_id } = data;

    return h(LinkCard, { href: "/lex/strat-names/" + strat_name_id }, strat_name)
}

function useStratData(lastID, input) {
    const result = useAPIResult(`${SETTINGS.apiV2Prefix}/defs/strat_names?page_size=20&last_id=${lastID}&strat_name_like=${input}`);
    return result?.success?.data;
}
