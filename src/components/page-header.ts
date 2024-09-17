import { MacrostratIcon } from "./macrostrat-icon";
import { DevLinkButton, Link } from "./buttons";
import h from "./icon.module.sass";
import { AnchorButton, ButtonGroup } from "@blueprintjs/core";
import {
  PageBreadcrumbsInternal,
  buildBreadcrumbs,
  sitemap,
} from "~/components/navigation";
import { usePageContext } from "vike-react/usePageContext";
import { Breadcrumbs } from "@blueprintjs/core";

export function PageHeader(props) {
  const {
    title = "Macrostrat",
    showSiteName = true,
    children,
    className,
  } = props;
  const siteName = "Macrostrat";
  let _showSiteName = showSiteName;
  if (title == siteName) {
    _showSiteName = false;
  }

  return h("h1.page-title", { className }, [
    h(MacrostratIcon, { size: 24 }),
    h.if(_showSiteName)([
      h(Link, { href: "/", className: "site-name" }, siteName),
      " ",
    ]),
    h("span.title", title),
    " ",
    children,
  ]);
}

export function PageHeaderV2({ className, title, children, showLogo = true }) {
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
