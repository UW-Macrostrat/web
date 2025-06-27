import h from "./main.module.sass";
import { InfiniteScrollView } from "@macrostrat/ui-components";
import { apiDomain } from "@macrostrat-web/settings";
import { StickyHeader, LinkCard, PageBreadcrumbs } from "~/components";
import { useState } from "react";
import { ContentPage } from "~/layouts";
import { SearchBar } from "~/components/general";
import { useData } from "vike-react/useData";

const PAGE_SIZE = 20;

export function Page() {
  const { res } = useData();

  const [input, setInput] = useState("");

  const handleChange = (event) => {
    setInput(event.toLowerCase());
  };

  return h(ContentPage, [
    h(StickyHeader, { className: "header" }, [
      h(PageBreadcrumbs, {
        title: "Minerals",
      }),
      h(SearchBar, {
        placeholder: "Filter by name...",
        onChange: handleChange,
      }),
    ]),
    h(InfiniteScrollView, {
      params: {
        order: "id.asc",
        mineral: `ilike.*${input}*`,
        id: `gt.0`,
        limit: PAGE_SIZE,
      },
      route: `${apiDomain}/api/pg/minerals`,
      getNextParams,
      initialData: res,
      hasMore,
      itemComponent: MineralItem,
    })
  ]);
}

function MineralItem({ data }) {
  const { id, mineral } = data;

  return h(LinkCard, {
    href: `/lex/minerals/${id}`,
    className: "mineral-item",
    title: mineral,
  });
}

function getNextParams(response, params) {
  const id = response[response.length - 1]?.id;
  return {
    ...params,
    id: "gt." + id,
  };
}

function hasMore(response) {
  return response.length === PAGE_SIZE; 
}