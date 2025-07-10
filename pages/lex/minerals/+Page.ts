import h from "./main.module.sass";
import { PostgRESTInfiniteScrollView } from "@macrostrat/ui-components";
import { apiDomain } from "@macrostrat-web/settings";
import { StickyHeader, LinkCard, PageBreadcrumbs } from "~/components";
import { ContentPage } from "~/layouts";
import { useData } from "vike-react/useData";

const PAGE_SIZE = 20;

export function Page() {
  const { res } = useData();

  return h(ContentPage, [
    h(StickyHeader, { className: "header" }, [
      h(PageBreadcrumbs, {
        title: "Minerals",
      }),
    ]),
    h(PostgRESTInfiniteScrollView, {
      route: `${apiDomain}/api/pg/minerals`,
      initialItems: res,
      itemComponent: MineralItem,
      filterable: true,
      id_key: "id",
      limit: PAGE_SIZE,
      searchColumns: ["mineral"],
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