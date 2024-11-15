import { MacrostratIcon } from "./macrostrat-icon";
import h from "./icon.module.sass";
import { ButtonGroup } from "@blueprintjs/core";
import {
  PageBreadcrumbsInternal,
  buildBreadcrumbs,
  sitemap,
} from "~/components/navigation";
import { usePageContext } from "vike-react/usePageContext";

export function PageHeader({ className, title, children, showLogo = true }) {
  /** A page header component that includes a title and breadcrumbs. */
  const ctx = usePageContext();
  let items = buildBreadcrumbs(ctx.urlPathname, sitemap, ctx);

  const lastItem = items.pop();
  let _title = title ?? lastItem.text;

  if (ctx.urlPathname == "/") {
    items = [];
  }

  return h("header.page-header", { className }, [
    h.if(showLogo)("div.header-left", h(MacrostratIcon, { size: 24 })),
    h("div.header-main", [
      h("div.header-top", [
        h.if(items.length > 0)(PageBreadcrumbsInternal, {
          showLogo: false,
          items,
        }),
        children,
      ]),
      h("h1.page-title", _title),
    ]),
  ]);
}

export function AssistantLinks({ children }) {
  return h("div.float-right.padding.stick-to-top", [
    h(ButtonGroup, { vertical: true, large: true }, [children]),
  ]);
}
