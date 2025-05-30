import h from "./main.module.scss";
import { useAPIResult, InfiniteScroll, LoadingPlaceholder } from "@macrostrat/ui-components";
import { SETTINGS } from "@macrostrat-web/settings";
import { PageHeader, Link, AssistantLinks, DevLinkButton, LinkCard, PageBreadcrumbs } from "~/components";
import { Card, Icon, Spinner, RangeSlider } from "@blueprintjs/core";
import { useState, useEffect, useRef } from "react";
import { ContentPage } from "~/layouts";
import { Loading } from "../index";

export function Page() {
    const [input, setInput] = useState("");
    const [lastID, setLastID] = useState(0);
    const [data, setData] = useState([]);
    const pageSize = 20;
    const result = useStratData(lastID, input, pageSize);

    console.log(result)

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
        h(PageBreadcrumbs, { title: "Maps" }),
        h(Card, { className: 'filters'}, [
            h("h2", 'Filter'),
            h('div.search-bar', [
                h(Icon, { icon: "search" }),
                h('input', {
                    type: "text",
                    placeholder: "Filter by name...",
                    onChange: handleChange,
                }),
            ])
        ]),
        h('div.strat-list',
            h('div.strat-items',
                data.map(data =>
                    h(Item, { data })
                )
            )
        ),
        LoadMoreTrigger({ data, setLastID, pageSize, result }),
    ]);          
}

function Item({ data }) {
    const { name, source_id } = data;

    return h(LinkCard, { href: "/lex/strat-names/" + source_id }, name)
}

function useStratData(lastID, input, pageSize) {
    return useAPIResult(`https://dev.macrostrat.org/api/pg/sources?order=source_id.asc&name=like.*${input}*&limit=${pageSize}&source_id=gt.` + lastID);
}

function LoadMoreTrigger({ data, setLastID, pageSize, result }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        if (data.length > 0) {
          setLastID(data[data.length - 1].source_id);
        }
      }
    });

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [data, setLastID]);

  return h.if(result?.length == pageSize)('div.load-more', { ref }, h(Spinner));
}