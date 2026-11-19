import {
  Boundary,
  Breadcrumb,
  Classes,
  Menu,
  MenuItem,
  OverflowList,
  PopoverNext,
} from "@blueprintjs/core";
import classNames from "classnames";
import { ReactNode, useCallback } from "react";

import h from "./breadcrumbs.module.sass";

export interface Crumb {
  text: ReactNode;
  href?: string;
  current?: boolean;
  /** The site root. Placed first or last in the collapsible run, so it goes
   * first or survives longest, and put back at the head of the trail by CSS
   * `order`. */
  isRoot?: boolean;
}

interface BreadcrumbTrailProps {
  items: Crumb[];
  /** Whether the last item is the current page's own crumb, which must stay
   * visible however tight things get. */
  hasTitleCrumb: boolean;
  /** Whether the Macrostrat logo sits beside the trail. */
  showLogo: boolean;
}

/**
 * Blueprint's own `Breadcrumbs` over the same `OverflowList`, with two
 * differences that the wrapper doesn't expose: the root crumb can collapse
 * before or after the rest, and when it does collapse beside the logo only its
 * text goes, leaving its chevron, instead of moving into the overflow menu —
 * the logo is the same link.
 */
export function BreadcrumbTrail({
  items,
  hasTitleCrumb,
  showLogo,
}: BreadcrumbTrailProps) {
  const renderCrumb = useCallback((item: Crumb, index: number) => {
    let className = null;
    if (item.isRoot) {
      className = "root-crumb";
    }
    return h(
      "li",
      { key: index, className },
      h(Breadcrumb, { text: item.text, href: item.href, current: item.current })
    );
  }, []);

  const renderOverflow = useCallback(
    (overflowItems: Crumb[]) => {
      let menuItems = overflowItems;
      let separator = null;
      if (showLogo) {
        menuItems = overflowItems.filter((item) => !item.isRoot);
        // Only the root's text goes; its chevron stays after the logo.
        if (menuItems.length < overflowItems.length) {
          separator = h("li.root-separator", { key: "root", "aria-hidden": true });
        }
      }

      let menuButton = null;
      if (menuItems.length > 0) {
        const menu = h(
          Menu,
          menuItems.map((item, i) =>
            h(MenuItem, { key: i, text: item.text, href: item.href })
          )
        );
        menuButton = h(
          "li",
          { key: "menu" },
          h(
            PopoverNext,
            { content: menu, placement: "bottom-start" },
            h("span", {
              "aria-label": "collapsed breadcrumbs",
              role: "button",
              tabIndex: 0,
              className: Classes.BREADCRUMBS_COLLAPSED,
            })
          )
        );
      }
      return [separator, menuButton];
    },
    [showLogo]
  );

  // Without a crumb for the current page there's nothing that has to survive,
  // so the root is free to collapse along with everything else.
  let minVisibleItems = 1;
  if (!hasTitleCrumb) {
    minVisibleItems = 0;
  }

  return h(OverflowList, {
    className: classNames(Classes.BREADCRUMBS, "breadcrumbs"),
    tagName: "ol",
    navigable: true,
    navigationAriaLabel: "Breadcrumb",
    collapseFrom: Boundary.START,
    minVisibleItems,
    items,
    visibleItemRenderer: renderCrumb,
    overflowRenderer: renderOverflow,
  });
}
