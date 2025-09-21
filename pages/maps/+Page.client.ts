import h from "./main.module.sass";
import { Switch, AnchorButton, Icon } from "@blueprintjs/core";
import { ContentPage } from "~/layouts";
import {
  DevLinkButton,
  AssistantLinks,
  LinkCard,
  StickyHeader,
} from "~/components";
import { useState } from "react";
import { PostgRESTInfiniteScrollView, InfiniteScrollView } from "@macrostrat/ui-components";
import { apiDomain } from "@macrostrat-web/settings";
import { IDTag, SearchBar } from "~/components/general";
import { useData } from "vike-react/useData";
import { PageBreadcrumbs } from "~/components";
import { usePageContext } from "vike-react/usePageContext";
import { apiV2Prefix } from "@macrostrat-web/settings";

const PAGE_SIZE = 20;

export function Page() {
  const { sources } = useData();

  const [activeOnly, setActiveOnly] = useState(true);
  const [recentOrder, setRecentOrder] = useState(true);

  const key = "" + activeOnly + recentOrder; // should be able to remove on next release (4.3.7)

  const initialItems = recentOrder && activeOnly ? sources : undefined;

  // check if filtering by lith or strat name
  const href = usePageContext().urlParsed.href;
  const lexFilter = href.includes("name")

  return h("div.maps-list-page", [
    h(ContentPage, [
      h("div.flex-row", [
        h("div.main", [
          h(StickyHeader, { className: "header-container" }, [
            h("div.header", [
              h(PageBreadcrumbs, {
                title: "Maps",
                showLogo: true,
              }),
              h("div.search", [
                h("div.switches", [
                  h(Switch, {
                    label: "Active only",
                    checked: activeOnly,
                    onChange: () => {
                      window.scrollTo(0, 0);
                      setActiveOnly(!activeOnly);
                    },
                  }),
                  h(Switch, {
                    label: "Recent order",
                    checked: recentOrder,
                    onChange: () => {
                      window.scrollTo(0, 0);
                      setRecentOrder(!recentOrder);
                    },
                  }),
                ]),
              ]),
            ]),
          ]),
          lexFilter ? h(FilterData)
           : h(PostgRESTInfiniteScrollView, {
            route: `${apiDomain}/api/pg/sources_metadata`,
            id_key: "source_id",
            order_key: recentOrder ? "ref_year" : undefined,
            filterable: true,
            extraParams: {
              is_finalized: activeOnly ? "eq.true" : undefined,
            },
            ascending: !recentOrder,
            limit: PAGE_SIZE,
            itemComponent: SourceItem,
            initialItems,
            key,
          }),
        ]),
        h(
          "div.sidebar",
          h("div.sidebar-content", [
            h(AssistantLinks, { className: "assistant-links" }, [
              h(
                AnchorButton,
                { icon: "flows", href: "/maps/ingestion" },
                "Ingestion system"
              ),
              h(
                AnchorButton,
                { icon: "map", href: "/map/sources" },
                "Show on map"
              ),
              h(DevLinkButton, { href: "/maps/legend" }, "Legend table"),
            ]),
          ])
        ),
      ]),
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
        h("div.source", [
          h("span", ref_source + ": " + ref_title + " (" + ref_year + ") "),
          h("a", { href: url, target: "_self" }, h(Icon, { icon: "link" })),
        ]),
        h("div.tags", [h(IDTag, { id: source_id })]),
      ]),
    ]
  );
}

function FilterData() {
  const params = usePageContext().urlParsed.href.split("?")[1].split("=")
  const filter = params[0]
  const id = params[1].split("&")[0]
  return h(InfiniteScrollView, {
    route: `${apiV2Prefix}/geologic_units/map/legend`,
    params: {
      [filter]: id,
      page: 1
    },
    limit: PAGE_SIZE,
  });
}