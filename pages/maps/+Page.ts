import h from "./main.module.sass";
import { Spinner, Switch, AnchorButton, Icon } from "@blueprintjs/core";
import { ContentPage } from "~/layouts";
import {
  PageHeader,
  DevLinkButton,
  AssistantLinks,
  LinkCard,
  StickyHeader,
} from "~/components";
import { useState, useMemo, useEffect } from "react";
import { InfiniteScrollView } from "@macrostrat/ui-components";
import { apiDomain } from "@macrostrat-web/settings";
import { IDTag, SearchBar } from "~/components/general";
import { useData } from "vike-react/useData";
import { PageBreadcrumbs } from "~/components";

const PAGE_SIZE = 20;

export function Page() {
  const { sources } = useData();

  const [input, setInput] = useState("");
  const [activeOnly, setActiveOnly] = useState(true);
  const [recentOrder, setRecentOrder] = useState(true);

  const baseParams = useMemo(() => {
    //const lastYear = sources?.[sources.length - 1]?.ref_year || 9999;
    //const lastId = sources?.[sources.length - 1]?.source_id || 0
    const lastYear = 9999;
    const lastId = 0;

    console.log("Last year:", lastYear);
    console.log("Last ID:", lastId);

    return {
      is_finalized: activeOnly ? "eq.true" : undefined,
      status_code: activeOnly ? "eq.active" : undefined,
      or: recentOrder
        ? `(ref_year.lt.${lastYear},and(ref_year.eq.${lastYear},source_id.gt.${lastId}))`
        : undefined,
      name: input ? `ilike.%${input}%` : undefined,
      order: recentOrder ? "ref_year.desc,source_id.asc" : "source_id.asc",
      limit: PAGE_SIZE,
    };
  }, [input, activeOnly, recentOrder]);

  function getNextParams(response, params) {
    const id = response[response.length - 1]?.source_id;
    const year = response[response.length - 1]?.ref_year || 9999;

    const newParams = {
      ...params,
      is_finalized: activeOnly ? "eq.true" : undefined,
      status_code: activeOnly ? "eq.active" : undefined,
      source_id: !recentOrder ? `gt.${id}` : undefined,
      or: recentOrder
        ? `(ref_year.lt.${year},and(ref_year.eq.${year},source_id.gt.${id}))`
        : undefined,
      name: `ilike.%${input}%`,
      order: recentOrder ? "ref_year.desc,source_id.asc" : "source_id.asc",
    };

    console.log("New params:", newParams, "response", response);

    return newParams
  }

  return h("div.maps-list-page", [
      h(ContentPage, [
        h("div.flex-row", [
          h('div.main', [
            h(StickyHeader, { className: "header-container" }, [
              h("div.header", [
                h(PageBreadcrumbs, {
                  title: "Maps",
                  showLogo: true,
                }),
                h('div.search', [
                  h(SearchBar, {
                    placeholder: "Filter by name...",
                    onChange: (event) => setInput(event.toLowerCase()),
                    className: "search-bar",
                  }),
                  h('div.switches', [
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
                ]),
              ]),
            ]),
            h(InfiniteScrollView, {
              params: baseParams,
              route: `${apiDomain}/api/pg/sources_metadata`,
              getNextParams,
              hasMore,
              initialItems: sources,
              itemComponent: SourceItem,
            })
          ]),
          h("div.sidebar", 
            h("div.sidebar-content", [
              h(AssistantLinks, { className: "assistant-links" }, [
                h(
                  AnchorButton,
                  { icon: "flows", href: "/maps/ingestion" },
                  "Ingestion system"
                ),
                h(AnchorButton, { icon: "map", href: "/map/sources" }, "Show on map"),
                h(DevLinkButton, { href: "/maps/legend" }, "Legend table"),
              ]),
            ])
          ),
        ])
      ]),
    ]);
  
  
  
  h("div.maps-page", [
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
    h(ContentPage, [
      
    ]),
  ]);
}

function SourceItem({ data }) {
  const { source_id, name, ref_title, url, scale, ref_year, ref_source } = data;
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
        h('div.source', [
          h("span", ref_source + ": " + ref_title + " (" + ref_year + ") "),
          h("a", { href: url, target: "_blank" }, 
            h(Icon, { icon: "link" }),
          ),
        ]),
        h("div.tags", [h(IDTag, { id: source_id })]),
      ]),
    ]
  );
}

function hasMore(response) {
  return response.length === PAGE_SIZE; 
}