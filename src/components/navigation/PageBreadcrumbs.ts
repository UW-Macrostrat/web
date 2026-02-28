import { usePageContext } from "vike-react/usePageContext";
import { Breadcrumbs } from "@blueprintjs/core";
import { useMemo } from "react";
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

export function PageBreadcrumbsInternal({
  showLogo = false,
  separateTitle = false,
  items,
}) {
  const baseItems = [...items];
  let titleElement = null;
  if (separateTitle) {
    const item = baseItems.pop();
    let identifier = null;
    if (item.identifier != null) {
      identifier = h("h2.identifier", h("code", ["#", item.identifier]));
    }

    let titleContent = item.name;
    if (item.title != null) {
      titleContent = h(item.title);
    }

    titleElement = h("div.title-block", [
      h("h1.page-title", titleContent),
      identifier,
    ]);
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
