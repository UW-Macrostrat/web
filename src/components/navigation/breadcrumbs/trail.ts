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
  /** The site root. Placed last in the collapsible run so it survives longest,
   * and put back at the head of the trail by CSS `order`. */
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
 * differences that the wrapper doesn't expose: the root crumb collapses *last*
 * rather than first, and when it does collapse it disappears instead of moving
 * into the overflow menu — the logo beside the trail is the same link.
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
      if (showLogo) {
        menuItems = overflowItems.filter((item) => !item.isRoot);
      }
      // A collapsed root on its own leaves nothing to open, so no button.
      if (menuItems.length === 0) {
        return null;
      }
      const menu = h(
        Menu,
        menuItems.map((item, i) =>
          h(MenuItem, { key: i, text: item.text, href: item.href })
        )
      );
      return h(
        "li",
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
