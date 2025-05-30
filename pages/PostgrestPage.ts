import { useAPIResult, InfiniteScroll, LoadingPlaceholder } from "@macrostrat/ui-components";
import { SETTINGS } from "@macrostrat-web/settings";
import { PageHeader, Link, AssistantLinks, DevLinkButton, LinkCard, PageBreadcrumbs } from "~/components";
import { Card, Icon, Spinner, RangeSlider } from "@blueprintjs/core";
import { useState, useEffect, useRef } from "react";
import { ContentPage } from "~/layouts";
import { Loading } from "./index";
import h from "@macrostrat/hyper";

export function PostgrestPage({ table, order_col, filter_col, pageSize, Item }) {
    const [input, setInput] = useState("");
    const [lastID, setLastID] = useState(0);
    const [data, setData] = useState([]);
    const result = useAPIResult(`https://dev.macrostrat.org/api/pg/${table}?order=${order_col}.asc&${filter_col}=like.*${input}*&limit=${pageSize}&${order_col}=gt.` + lastID);

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
        h(PageBreadcrumbs),
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
        LoadMoreTrigger({ data, setLastID, pageSize, result, order_col }),
    ]);          
}

function LoadMoreTrigger({ data, setLastID, pageSize, result, order_col }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        if (data.length > 0) {
          setLastID(data[data.length - 1][order_col]);
        }
      }
    });

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [data, setLastID]);

  return h.if(result?.length == pageSize)('div.load-more', { ref }, h(Spinner));
}