import { usePageContext } from "vike-react/usePageContext";
import { Breadcrumbs } from "@blueprintjs/core";
import { useMemo } from "react";
import { MacrostratIcon } from "~/components";
import { buildBreadcrumbs } from "~/_utils/breadcrumbs";

import h from "./breadcrumbs.module.sass";

export function PageBreadcrumbs({ showLogo = true, title = null }) {
  const ctx = usePageContext();
  console.log("pageBreadcrumbs", ctx.breadcrumbs);

  const _title = title ?? ctx.config.title;

  return h(PageBreadcrumbsInternal, {
    showLogo,
    items: ctx.breadcrumbs,
  });
}

export function PageBreadcrumbsInternal({ showLogo = false, items }) {
  let itemsList = [...items];
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

  return h(Breadcrumbs, {
    items: itemsList,
  });
}
