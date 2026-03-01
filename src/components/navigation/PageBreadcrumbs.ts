import { usePageContext } from "vike-react/usePageContext";
import { Breadcrumbs } from "@blueprintjs/core";
import { ReactNode, useMemo } from "react";
import { MacrostratIcon } from "~/components";
import { buildBreadcrumbs } from "~/_utils/breadcrumbs";

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

export function TitleBlock({ title, identifier, headingLevel = 1, className }) {
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

export function PageBreadcrumbsInternal({
  showLogo = false,
  separateTitle = false,
  items,
}) {
  const baseItems = [...items];
  let titleElement = null;
  if (separateTitle) {
    const item = baseItems.pop();

    let titleContent: ReactNode = item.name;
    if (typeof item.title === "string") {
      titleContent = item.title;
    } else if (item.title != null) {
      titleContent = h(item.title);
    }

    titleElement = h(TitleBlock, {
      title: titleContent,
      identifier: item.identifier,
    });
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
