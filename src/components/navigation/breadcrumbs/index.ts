import { usePageContext } from "vike-react/usePageContext";
import { ReactNode, useMemo } from "react";
import { MacrostratIcon } from "~/components";
import { buildBreadcrumbs, Item } from "./utils";
import { BreadcrumbTrail, Crumb } from "./trail";
import { Identifier } from "@macrostrat/data-components";
import { isValidElement } from "react";

import h from "./breadcrumbs.module.sass";

/** What the page title does once the trail has given up all the space it can:
 * clip to a single line with an ellipsis, or wrap onto more lines. */
export type TitleOverflow = "ellipsis" | "wrap";

interface PageBreadcrumbsProps {
  showLogo?: boolean;
  separateTitle?: boolean;
  titleOverflow?: TitleOverflow;
}

export function PageBreadcrumbs({
  showLogo = true,
  separateTitle = true,
  titleOverflow,
}: PageBreadcrumbsProps) {
  const breadcrumbs = usePageBreadcrumbs();
  return h(PageBreadcrumbsInternal, {
    showLogo,
    separateTitle,
    titleOverflow,
    items: breadcrumbs,
  });
}

export function TitleBlock({
  title,
  identifier,
  headingLevel = 1,
  className,
  titleOverflow = "wrap",
}: {
  title: ReactNode;
  identifier?: number;
  headingLevel?: number;
  className?: string;
  titleOverflow?: TitleOverflow;
}) {
  const HeadingTag = "h" + headingLevel;
  const IdentifierTag = "h" + (headingLevel + 1);
  return h(
    "div.title-block",
    { className: overflowClass(className, titleOverflow) },
    [
      h(HeadingTag, title),
      h.if(identifier != null)(
        IdentifierTag,
        { className: "identifier" },
        h(Identifier, { id: identifier })
      ),
    ]
  );
}

export function usePageBreadcrumbs(): Item[] {
  const ctx = usePageContext();
  return useMemo(() => {
    return buildBreadcrumbs(ctx);
  }, [ctx]);
}

interface PageTitleProps {
  className?: string;
  headingLevel?: number;
  titleOverflow?: TitleOverflow;
}

export function PageTitle({
  className,
  headingLevel = 1,
  titleOverflow,
}: PageTitleProps) {
  const breadcrumbs = usePageBreadcrumbs();
  const item = breadcrumbs[breadcrumbs.length - 1];
  if (item == null) {
    return null;
  }
  return h(__PageTitle, { item, className, headingLevel, titleOverflow });
}

function __PageTitle({ item, ...rest }: { item: Item } & PageTitleProps) {
  return h(TitleBlock, {
    title: nameForItem(item, false),
    identifier: item.identifier,
    ...rest,
  });
}

export function usePageTitle(): string | null {
  const breadcrumbs = usePageBreadcrumbs();
  const item = breadcrumbs[breadcrumbs.length - 1];
  return nameForItem(item, false);
}

interface PageBreadcrumbsInternalProps extends PageBreadcrumbsProps {
  items: Item[];
}

/**
 * The trail sheds width in stages, coarsest first:
 *
 * 1. middle crumbs move into the overflow menu, innermost last;
 * 2. then the "Macrostrat" root crumb goes — silently, taking its chevron with
 *    it, because the logo beside the trail is the same link. That leaves
 *    `[logo] … › Title`;
 * 3. only then does the title truncate, per `titleOverflow` — which defaults
 *    to wrapping when the title has a line of its own and to an ellipsis when
 *    it rides along as the trail's last crumb.
 *
 * Stages 1 and 2 are one partition, so they can't fight each other: the root is
 * handed to the `OverflowList` at the *end* of the collapsible run and moved
 * back to the head of the trail with CSS `order`. Stage 3 then falls out of the
 * flex layout rather than a measurement pass, since the `OverflowList` decides
 * to collapse from its own 1px spacer, which any overflow at all squeezes to
 * zero — so a crumb only starts giving up characters once there is nothing left
 * to collapse. See `breadcrumbs.module.sass`.
 */
export function PageBreadcrumbsInternal({
  showLogo = false,
  separateTitle = false,
  titleOverflow,
  items,
}: PageBreadcrumbsInternalProps) {
  const trail = [...items];

  // A title on its own line has room to wrap; one sharing the trail's row does
  // not.
  let overflow: TitleOverflow = "ellipsis";
  if (separateTitle) {
    overflow = "wrap";
  }
  if (titleOverflow != null) {
    overflow = titleOverflow;
  }

  let titleElement = null;
  if (separateTitle) {
    const item = trail.pop();
    if (item != null) {
      titleElement = h(__PageTitle, { item, titleOverflow: overflow });
    }
  }

  // Pulled out of its natural first position so it can be re-inserted as the
  // last of the collapsible crumbs.
  let rootItem = null;
  if (trail[0]?.isRoot) {
    rootItem = trail.shift();
  }

  const hasTitleCrumb = !separateTitle && trail.length > 0;

  // The item's identifier, when the title rides along as the trail's last crumb.
  // Only `__PageTitle` renders it, and that is the `separateTitle` path — so on
  // a single-row header (the hybrid frame, the infinite-scroll list) a page that
  // supplies one was silently dropping it: the column page set
  // `identifier: col_id` in its `pageInfo` and never showed an id.
  let identifierElement = null;
  const currentItem = trail[trail.length - 1];
  if (hasTitleCrumb && currentItem?.identifier != null) {
    identifierElement = h(
      "span.nav-identifier",
      h(Identifier, { id: currentItem.identifier })
    );
  }

  let crumbs: Crumb[] = trail.map((item, i) => {
    return {
      // `text`, not `children`: the same props feed the overflow menu's
      // `MenuItem`s, where `children` would be read as a submenu — which is
      // what produced a dropdown inside the dropdown.
      text: nameForItem(item, true),
      href: item.href,
      current: hasTitleCrumb && i === trail.length - 1,
    };
  });

  if (rootItem != null) {
    let insertAt = crumbs.length;
    if (hasTitleCrumb) {
      insertAt = crumbs.length - 1;
    }
    crumbs.splice(insertAt, 0, {
      text: nameForItem(rootItem, true),
      href: rootItem.href,
      isRoot: true,
    });
  }

  let breadcrumbsList = null;
  if (crumbs.length > 0) {
    breadcrumbsList = h(BreadcrumbTrail, {
      items: crumbs,
      hasTitleCrumb,
      showLogo,
    });
  } else if (!showLogo) {
    // Nothing to show and no logo standing in for it: fall back to the wordmark.
    breadcrumbsList = h(
      "a.breadcrumbs-fallback",
      { href: "/" },
      h("h1.macrostrat-wordmark.small", "Macrostrat")
    );
  }

  let startItem = null;
  if (showLogo) {
    startItem = h(
      "a.base.logo-container",
      { href: "/" },
      h(MacrostratIcon, { iconStyle: "simple", small: true })
    );
  }

  // The modifier only reaches the trail when the last crumb *is* the title;
  // otherwise the trail stays on one line and the title block handles itself.
  let trailClassName = null;
  if (!separateTitle) {
    trailClassName = overflowClass(null, overflow);
  }

  const breadCrumbs = h("div.breadcrumbs-root", { className: trailClassName }, [
    startItem,
    breadcrumbsList,
    identifierElement,
  ]);

  return h("div.page-nav", [breadCrumbs, titleElement]);
}

function overflowClass(
  className: string | null | undefined,
  titleOverflow: TitleOverflow
): string {
  let overflow = "title-ellipsis";
  if (titleOverflow === "wrap") {
    overflow = "title-wrap";
  }
  if (className == null) {
    return overflow;
  }
  return className + " " + overflow;
}

function nameForItem(
  item: Item | null | undefined,
  short: boolean = true
): ReactNode {
  if (item == null) {
    return null;
  }
  const titleVal = short ? item.shortTitle : item.title;
  if (typeof titleVal === "string" || isValidElement(titleVal)) {
    return titleVal;
  } else if (titleVal != null) {
    return h(titleVal);
  }
  return item.name;
}
