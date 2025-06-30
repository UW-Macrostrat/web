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
  console.log("sources", sources);

  const [input, setInput] = useState("");
  const [activeOnly, setActiveOnly] = useState(true);
  const [recentOrder, setRecentOrder] = useState(true);

  const startingID = sources[sources.length - 1].source_id;
  const [key, setKey] = useState({
    lastID: startingID,
    lastYear: 9999,
  });
  const [data, setData] = useState(sources);
  const pageSize = 20;

  const result = useSourceData(
    key.lastID,
    input,
    pageSize,
    activeOnly,
    recentOrder,
    key.lastYear
  );

  useEffect(() => {
    if (
      result &&
      data[data.length - 1]?.source_id !== result[result.length - 1]?.source_id
    ) {
      setData((prevData) => {
        return [...prevData, ...result];
      });
    }
  }, [result]);

  const resetData = () => {
    window.scrollTo(0, 0);
    setData([]);
    setKey({
      lastID: 0,
      lastYear: 9999,
    });
  };

  const handleInputChange = (event) => {
    setInput(event.toLowerCase());
    resetData();
  };

  const handleActiveChange = () => {
    setActiveOnly(!activeOnly);
    resetData();
  };

  const handleRecentChange = () => {
    setRecentOrder(!recentOrder);
    resetData();
  };

  return h("div.maps-page", [
    h(ContentPage, [
      h(StickyHeader, { className: "header-container" }, [
        h("div.header", [
          h(PageBreadcrumbs, {
            title: "Maps",
            showLogo: true,
          }),
          h('div.search', [
            h(SearchBar, {
              placeholder: "Filter by name...",
              onChange: handleInputChange,
              className: "search-bar",
            }),
            h('div.switches', [
              h(Switch, {
                label: "Active only",
                checked: activeOnly,
                onChange: handleActiveChange,
              }),
              h(Switch, {
                label: "Recent order",
                checked: recentOrder,
                onChange: handleRecentChange,
              }),
            ]),
          ]),
        ]),
      ]),
      h('div.assistant-links', 
        h(AssistantLinks, { className: "assistant-links" }, [
          h(
            AnchorButton,
            { icon: "flows", href: "/maps/ingestion" },
            "Ingestion system"
          ),
          h(AnchorButton, { icon: "map", href: "/map/sources" }, "Show on map"),
          h(DevLinkButton, { href: "/maps/legend" }, "Legend table"),
        ]),
      ),
      h(
        "div.strat-list",
        h(
          "div.strat-items",
          data.map((data) => h(SourceItem, { data }))
        )
      ),
      LoadMoreTrigger({ data, setKey, pageSize, result }),
    ]),
  ]);
}

function useSourceData(
  lastID,
  input,
  pageSize,
  activeOnly,
  recentOrder,
  lastYear
) {
  const url = `${apiDomain}/api/pg/sources_metadata`;

  const result = useAPIResult(url, {
    is_finalized: activeOnly ? "eq.true" : undefined,
    status_code: activeOnly ? "eq.active" : undefined,
    source_id: !recentOrder ? `gt.${lastID}` : undefined,
    or: recentOrder
      ? `(ref_year.lt.${lastYear},and(ref_year.eq.${lastYear},source_id.gt.${lastID}))`
      : undefined,
    name: `ilike.%${input}%`,
    limit: pageSize,
    order: recentOrder ? "ref_year.desc,source_id.asc" : "source_id.asc",
  });
  return result;
}

function LoadMoreTrigger({ data, setKey, pageSize, result }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        if (data.length > 0) {
          const id = data[data.length - 1].source_id;
          const year = data[data.length - 1].ref_year || 9999;

          setKey({
            lastID: id,
            lastYear: year,
          });
        }
      }
    });

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [data]);

  return h.if(result?.length == pageSize)("div.load-more", { ref }, h(Spinner));
}

function SourceItem({ data }) {
  const { source_id, name, ref_title, url, scale, ref_year } = data;
  const href = `/maps/${source_id}`;

  return h(
    LinkCard,
    {
      href,
      title: h("div.title", [
        h("h2", name),
        h("div", { className: "size " + scale }, scale),
      ]),
    },
    [
      h("div.content", [
        h("a", { href: url, target: "_blank" }, ref_title),
        h("div.tags", [h(IDTag, { id: source_id })]),
      ]),
    ]
  );
}