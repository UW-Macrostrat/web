import { useAPIResult, InfiniteScroll, LoadingPlaceholder } from "@macrostrat/ui-components";
import { SETTINGS } from "@macrostrat-web/settings";
import { PageHeader, Link, AssistantLinks, DevLinkButton, LinkCard, PageBreadcrumbs } from "~/components";
import { Card, Icon, Spinner, RangeSlider } from "@blueprintjs/core";
import { useState, useEffect, useRef } from "react";
import { ContentPage } from "~/layouts";
import { Loading } from "./index";
import h from "./postgrest.module.scss";

export function PostgrestPage({ 
    table, 
    order_col, 
    filter_col, 
    pageSize, 
    ItemList, 
    start = 0, 
    order = "asc", 
    order_col2 = null, 
    Header = function Header({ data }) { return null; } 
}) {
    const [input, setInput] = useState("");
    const [lastID, setLastID] = useState(0);
    const [lastID2, setLastID2] = useState(start);
    const [data, setData] = useState([]);
    const url1 = `https://dev.macrostrat.org/api/pg/${table}?${filter_col}=like.*${input}*&limit=${pageSize}&${order_col}=gt.${lastID}&order=${order_col}.${order}`;
    const url2 = `https://dev.macrostrat.org/api/pg/${table}?${filter_col}=like.*${input}*&limit=${pageSize}&or=(${order_col2}.gt.${lastID2},and(${order_col2}.eq.${lastID2},${order_col}.gt.${lastID}))&order=${order_col2 ? order_col2 : order_col }.${order}`;
    const url = order_col2 ? url2 : url1;
    const result = useAPIResult(url);

    useEffect(() => {
        if (result) {
            setData(prevData => [...prevData, ...result]);
        }
    }, [result]);

    useEffect(() => {
        setLastID(0);
        setLastID2(start);
        setData([]);
    }, [input]);


    if (data == null) return h(Loading);

    const handleChange = (event) => { 
        setInput(event.target.value.toLowerCase());
    }

    return h(ContentPage, [
        h(PageBreadcrumbs),
        Header({ data }),
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
        ItemList({ data }),
        LoadMoreTrigger({ data, setLastID, pageSize, result, order_col, setLastID2, order_col2 }),
    ]);          
}

function LoadMoreTrigger({ data, setLastID, pageSize, result, order_col, setLastID2, order_col2 }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        if (data.length > 0) {
            setLastID(data[data.length - 1][order_col]);
            setLastID2(data[data.length - 1][order_col2]);
        }
      }
    });

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [data, setLastID]);

  return h.if(result?.length == pageSize)('div.load-more', { ref }, h(Spinner));
}

