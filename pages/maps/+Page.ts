import h from "./main.module.scss";
import { Spinner, Switch, AnchorButton } from "@blueprintjs/core";
import { ContentPage } from "~/layouts";
import {
  PageHeader,
  DevLinkButton,
  AssistantLinks,
  LinkCard,
  StickyHeader,
} from "~/components";
import { useState, useRef, useEffect } from "react";
import { useAPIResult } from "@macrostrat/ui-components";
import { apiDomain } from "@macrostrat-web/settings";
import { IDTag, SearchBar } from "~/components/general";
import { useData } from "vike-react/useData";
import { PageBreadcrumbs } from "~/components";

export function Page() {
  const { sources } = useData();

  const [input, setInput] = useState("");
  const [activeOnly, setActiveOnly] = useState(true);
  const [recentOrder, setRecentOrder] = useState(false);

  const startingID = sources[sources.length - 1].source_id;
  const [lastID, setLastID] = useState(startingID);
  const [lastYear, setLastYear] = useState(9999);
  const [data, setData] = useState(sources);
  const pageSize = 20;

  const result = useSourceData(lastID, input, pageSize, activeOnly, recentOrder, lastYear);
  const prevInputRef = useRef(input);
  const prevActiveOnlyRef = useRef(activeOnly);
  const prevRecentOrderRef = useRef(recentOrder);

  useEffect(() => {
    if (prevInputRef.current !== input || prevActiveOnlyRef.current !== activeOnly || prevRecentOrderRef.current !== recentOrder) {
      setData([]);
      setLastID(0);
      setLastYear(9999);

      prevInputRef.current = input;
      prevActiveOnlyRef.current = activeOnly;
      prevRecentOrderRef.current = recentOrder;
    }
  }, [input, activeOnly, recentOrder]);

  useEffect(() => {
    if (
      result &&
      data[data.length - 1]?.source_id !==
        result[result.length - 1]?.source_id
    ) {
      setData((prevData) => {
        return [...prevData, ...result];
      });
    }
  }, [result]);

  const handleChange = (event) => {
    setInput(event.toLowerCase());
  };

  return h('div.maps-page', [
    h(ContentPage, [
      h(StickyHeader, {className: "header-container"}, [
        h('div.header', [
          h(PageBreadcrumbs, {
            title: "Maps",
          }),
          h(SearchBar, {
            placeholder: "Filter by name...",
            onChange: handleChange,
          }),
          h(Switch, {
            label: "Active only",
            checked: activeOnly,
            onChange: () => setActiveOnly(!activeOnly),
          }),
          h(Switch, {
            label: "Recent order",
            checked: recentOrder,
            onChange: () => setRecentOrder(!recentOrder),
          }),
        ]),
        h(AssistantLinks, { className: "assistant-links" }, [
          h(
            AnchorButton,
            { icon: "flows", href: "/maps/ingestion" },
            "Ingestion system"
          ),
          h(AnchorButton, { icon: "map", href: "/map/sources" }, "Show on map"),
          h(DevLinkButton, { href: "/maps/legend" }, "Legend table"),
        ]),
      ]),
      h(
        "div.strat-list",
        h(
          "div.strat-items",
          data.map((data) => h(SourceItem, { data }))
        )
      ),
      LoadMoreTrigger({ data, setLastID, pageSize, result, setLastYear }),
    ]),

  ]);
}

function useSourceData(lastID, input, pageSize, activeOnly, recentOrder, lastYear) {
  const url = `${apiDomain}/api/pg/sources_metadata`;
  const filter = "or=(ref_year.lt.2022,and(ref_year.eq.2022,source_id.gt.120))";

  const result = useAPIResult(url, {
      is_finalized: activeOnly ? "eq.true" : undefined,
      status_code: activeOnly ? "eq.active" : undefined,
      source_id: !recentOrder ? `gt.${lastID}` : undefined,
      or: recentOrder ? `(ref_year.lt.${lastYear},and(ref_year.eq.${lastYear},source_id.gt.${lastID}))` : undefined,
      name: `ilike.%${input}%`,
      limit: pageSize,
      order: "source_id.asc",
  });
  return result;
}

function LoadMoreTrigger({ data, setLastID, pageSize, result, setLastYear }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        if (data.length > 0) {
          const id = data[data.length - 1].source_id;
          const year = data[data.length - 1].ref_year || 9999;

          setLastID(id);
          setLastYear(year);
        }
      }
    });

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [data, setLastID, setLastYear]);

  return h.if(result?.length == pageSize)("div.load-more", { ref }, h(Spinner));
}

function SourceItem({ data }) {
  const { source_id, name, ref_title, url, scale } = data;
  const href = `/maps/${source_id}`;

  return h(
    LinkCard,
    {
      href,
      title: h('div.title', [
        h('h2', name),
        h("div", { className: "size " + scale }, scale),
      ])
    },
    [
      h('div.content', [
        h("a", { href: url, target: "_blank" }, ref_title),
        h('div.tags', [
          h(IDTag, { id: source_id }),
        ])
      ])
    ]
  );
}