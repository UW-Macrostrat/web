import { usePageContext } from "vike-react/usePageContext";
import { Breadcrumbs } from "@blueprintjs/core";
import { ReactNode, useMemo } from "react";
import { MacrostratIcon } from "~/components";
import { buildBreadcrumbs, Item } from "./utils";
import { Identifier } from "@macrostrat/data-components";
import { isValidElement } from "react";

import h from "./breadcrumbs.module.sass";

export function PageBreadcrumbs({ showLogo = true, separateTitle = true }) {
  const breadcrumbs = usePageBreadcrumbs();
  return h(PageBreadcrumbsInternal, {
    showLogo,
    separateTitle,
    items: breadcrumbs,
  });
}

export function TitleBlock({
  title,
  identifier,
  headingLevel = 1,
  className,
}: {
  title: ReactNode;
  identifier?: number;
  headingLevel?: number;
  className?: string;
}) {
  const HeadingTag = "h" + headingLevel;
  const IdentifierTag = "h" + (headingLevel + 1);
  return h("div.title-block", { className }, [
    h(HeadingTag, title),
    h.if(identifier != null)(
      IdentifierTag,
      { className: "identifier" },
      h(Identifier, { id: identifier })
    ),
  ]);
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
}

export function PageTitle({
  className,
  headingLevel = 1,
}: {
  className?: string;
  headingLevel?: number;
}) {
  const breadcrumbs = usePageBreadcrumbs();
  const item = breadcrumbs[breadcrumbs.length - 1];
  if (item == null) {
    return null;
  }
  return h(__PageTitle, { item, className, headingLevel });
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

export function PageBreadcrumbsInternal({
  showLogo = false,
  separateTitle = false,
  items,
}) {
  const baseItems = [...items];
  let titleElement = null;
  if (separateTitle) {
    const item = baseItems.pop();
    titleElement = h(__PageTitle, { item });
  }

  let itemsList = baseItems.map((item, i) => {
    return {
      children: nameForItem(item, true),
      href: item.href,
      current: i === items.length - 1,
    };
  });
  if (itemsList.length === 0) {
    itemsList = [
      {
        children: h("span.breadcrumbs-root", "Macrostrat"),
        href: "/",
        current: true,
      },
    ];
  }

  let startItem = null;
  if (showLogo) {
    startItem = h(
      "a.base.logo-container",
      { href: "/" },
      h(MacrostratIcon, { iconStyle: "simple", small: true })
    );
  }

  const breadCrumbs = h("div.breadcrumbs-root", [
    startItem,
    h(Breadcrumbs, { className: "breadcrumbs", items: itemsList }),
  ]);

  return h("div.page-nav", [breadCrumbs, titleElement]);
}

function nameForItem(item: Item, short: boolean = true): ReactNode {
  const titleVal = short ? item.shortTitle : item.title;
  if (typeof titleVal === "string" || isValidElement(titleVal)) {
    return titleVal;
  } else if (titleVal != null) {
    return h(titleVal);
  }
  return item.name;
}
