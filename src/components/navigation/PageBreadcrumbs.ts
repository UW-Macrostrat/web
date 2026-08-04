import { usePageContext } from "vike-react/usePageContext";
import { Breadcrumbs } from "@blueprintjs/core";
import { ReactNode, useMemo } from "react";
import { MacrostratIcon } from "~/components";
import { buildBreadcrumbs, Item } from "~/_utils/breadcrumbs/helpers";
import { Identifier } from "@macrostrat/data-components";

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
    const breadcrumbs = buildBreadcrumbs(ctx);
    console.log(breadcrumbs);
    return breadcrumbs;
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
  const ctx = usePageContext();
  const breadcrumbs = useMemo(() => {
    return buildBreadcrumbs(ctx);
  }, [ctx]);
  const item = breadcrumbs[breadcrumbs.length - 1];
  if (item == null) {
    return null;
  }
  return h(__PageTitle, { item, className, headingLevel });
}

function __PageTitle({ item, ...rest }: { item: Item } & PageTitleProps) {
  console.log("PageTitle", item, rest);

  let titleContent: ReactNode = item.name;
  if (typeof item.title === "string") {
    titleContent = item.title;
  } else if (item.title != null) {
    titleContent = h(item.title);
  }

  return h(TitleBlock, {
    title: titleContent,
    identifier: item.identifier,
    ...rest,
  });
}

export function usePageTitle(): string | null {
  const breadcrumbs = usePageBreadcrumbs();
  return ctx?.pageInfo?.name ?? ctx?.title;
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

  let itemsList = baseItems.map((item) => {
    return {
      text: item.name,
      href: item.href,
    };
  });
  if (itemsList.length === 0) {
    itemsList = [
      {
        text: h("span.breadcrumbs-root", "Macrostrat"),
        href: "/",
      },
    ];
  }

  let startItem = null;
  if (showLogo) {
    startItem = h(
      "a.base",
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
