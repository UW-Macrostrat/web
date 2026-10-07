import classNames from "classnames";
import { ReactNode } from "react";
import { usePageContext } from "vike-react/usePageContext";
import {
  PageHeader,
  type PageHeaderProps,
  type Crumb,
} from "@macrostrat/ui-components";
import { Identifier } from "@macrostrat/data-components";
import { MacrostratIcon, MacrostratIconStyle } from "~/components/general";
import { nameForItem, usePageBreadcrumbs } from "./breadcrumbs";
import type { Item } from "./breadcrumbs/utils";

import h from "./site-header.module.sass";

export type SitePageHeaderProps = Omit<
  PageHeaderProps,
  "logo" | "breadcrumbs" | "title" | "shortTitle" | "identifier"
>;

/**
 * The site's page header: `PageHeader` (`@macrostrat/ui-components`) filled
 * from the route — the Macrostrat logo, the trail `pageContext` builds, and
 * the current page's title, short title and identifier from its `pageInfo`.
 * Layout options (`variant`, `sticky`, `width`, `actions`, …) pass through.
 * A page's (or subtree's) `headerActions` config leads the action slot, ahead
 * of any `actions` the layout adds (e.g. the hybrid frame's view controls).
 *
 * When sticky (always, for `hybrid`), the header's parent is its sticky
 * boundary, so render it as a direct child of the page or scroll container.
 */
export function SitePageHeader(props: SitePageHeaderProps) {
  const { className, actions, ...rest } = props;
  const items = usePageBreadcrumbs();
  const PageActions = usePageContext().config.headerActions;
  let headerActions: ReactNode = actions;
  if (PageActions != null) {
    headerActions = h([h(PageActions, { key: "page" }), actions]);
  }
  return h(PageHeader, {
    ...headerContent(items),
    logo: h(SiteLogo),
    titleAlignment: "left",
    actions: headerActions,
    className: classNames("site-page-header", className),
    ...rest,
  });
}

function headerContent(items: Item[]) {
  const ancestors = items.slice(0, -1);
  const current = items[items.length - 1];

  const breadcrumbs: Crumb[] = ancestors.map((item) => ({
    text: crumbText(item),
    href: item.href,
  }));

  let title: ReactNode = null;
  let shortTitle: string | undefined = undefined;
  let identifier: ReactNode = null;
  if (current != null) {
    title = nameForItem(current, false);
    shortTitle = shortTitleFor(current, title);
    if (current.identifier != null) {
      identifier = h(Identifier, { id: current.identifier });
    }
  }
  return { breadcrumbs, title, shortTitle, identifier };
}

/** The root's crumb is the wordmark (inline, not the `h1` the older trail
 * used, since the page's own title is the heading); others their short name. */
function crumbText(item: Item): ReactNode {
  if (item.isRoot) {
    return h("span.macrostrat-wordmark", "Macrostrat");
  }
  return nameForItem(item, true);
}

/** A short form for the single-row title, when the page has a distinct one:
 * its `shortTitle`, or its `name` where the full title differs. */
function shortTitleFor(item: Item, title: ReactNode): string | undefined {
  const short = nameForItem(item, true);
  if (typeof short == "string" && typeof title == "string" && short != title) {
    return short;
  }
  if (
    typeof item.name == "string" &&
    typeof title == "string" &&
    item.name.length < title.length
  ) {
    return item.name;
  }
  return undefined;
}

function SiteLogo() {
  return h(
    "a.site-logo",
    { href: "/", "aria-label": "Macrostrat home" },
    h(MacrostratIcon, { iconStyle: MacrostratIconStyle.SIMPLE })
  );
}
