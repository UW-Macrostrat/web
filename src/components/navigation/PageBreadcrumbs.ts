import { usePageContext } from "vike-react/usePageContext";
import { Breadcrumbs } from "@blueprintjs/core";
import { ReactNode, useMemo } from "react";
import { MacrostratIcon } from "~/components";
import { buildBreadcrumbs, Item } from "~/_utils/breadcrumbs";
import { PageContext } from "vike/types";

import h from "./breadcrumbs.module.sass";

export function PageBreadcrumbs({ showLogo = true, separateTitle = true }) {
  const ctx = usePageContext();
  const breadcrumbs = useMemo(() => {
    return buildBreadcrumbs(ctx);
  }, [ctx]);

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
      h(Identifier, { identifier })
    ),
  ]);
}

export function Identifier({
  identifier,
  className,
}: {
  identifier: number;
  className?: string;
}) {
  return h("code.identifier", { className }, ["#", identifier]);
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

  if (showLogo) {
    itemsList[0] = {
      text: h("span.breadcrumbs-root", [
        h(MacrostratIcon, { iconStyle: "simple", small: true }),
        "Macrostrat",
      ]),
      href: "/",
    };
  }

  const breadcrumbs = h(Breadcrumbs, {
    items: itemsList,
  });

  return h("div.page-nav", [breadcrumbs, titleElement]);
}
