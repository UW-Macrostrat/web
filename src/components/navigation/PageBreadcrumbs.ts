import { PageContext } from "vike/types";
import { usePageContext } from "vike-react/usePageContext";
import { Breadcrumbs } from "@blueprintjs/core";
import React, { useMemo } from "react";
import { MacrostratIcon, MacrostratLogoLink } from "~/components";
import hyper from "@macrostrat/hyper";

import h from "./breadcrumbs.module.sass";

export function PageBreadcrumbs({ showLogo = true, title }) {
  const ctx = usePageContext();

  const items = useMemo(() => {
    let items = buildBreadcrumbs(ctx.urlPathname, sitemap, ctx);
    if (title != null) {
      items[items.length - 1].text = title;
    }
    return items;
  }, [ctx.urlPathname, title]);

  return h(PageBreadcrumbsInternal, {
    showLogo,
    items,
  });
}

export function PageBreadcrumbsInternal({ showLogo = false, items }) {
  let itemsList = items;
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

export function buildBreadcrumbs(
  currentPath: string,
  routes: Routes,
  ctx: PageContext
): Item[] {
  const parts = currentPath.split("/");
  const items: Item[] = [];
  let children = [routes];
  let route = "";

  for (const urlPart of parts) {
    // if (children == null) {
    //   break;
    // }
    const child = children?.find((d) => {
      if (d.param != null) {
        const param = d.param.replace(/^@/, "");
        if (param in ctx.routeParams) {
          if (ctx.routeParams[param] == urlPart) {
            return true;
          }
        }
      }
      return d.slug == urlPart;
    });

    // if (child == null) {
    //   break;
    // }
    const name = child?.name ?? urlPart;
    if (route.endsWith("/")) {
      route = route.slice(0, -1);
    }
    route += `/${urlPart}`;

    let text = typeof name === "function" ? name(urlPart, ctx) : name;
    if (name == urlPart) {
      text = h("code", text);
    }

    let disabled = child?.disabled ?? false;

    items.push({
      text,
      href: route == currentPath ? undefined : route,
      disabled,
    });
    children = child?.children;
  }
  return items;
}

interface Item {
  text: string | React.ReactNode;
  href?: string;
  current?: boolean;
  disabled?: boolean;
}

interface Routes {
  slug?: string;
  name: string | ((urlPart: string, ctx: PageContext) => React.ReactNode);
  param?: string;
  disabled?: boolean;
  children?: Routes[];
}

const columnsSubtree = {
  slug: "columns",
  name: "Columns",
  children: [
    {
      param: "@column",
      name(urlPart, ctx) {
        return h("span.column-name", [
          ctx.pageProps?.columnInfo?.col_name ?? urlPart,
        ]);
      },
    },
    {
      slug: "groups",
      name: "Groups",
      children: [
        {
          param: "@id",
          name(urlPart, ctx) {
            return h("code", ctx.pageProps?.group?.group_id ?? urlPart);
          },
        },
      ],
    },
  ],
};

export const sitemap: Routes = {
  slug: "",
  name: "Macrostrat",
  children: [
    {
      slug: "dev",
      name: "Development",
      children: [
        {
          slug: "ui-tests",
          name: "UI tests",
          children: [
            {
              slug: "data-sheet",
              name: "Data sheet",
            },
            {
              slug: "lithology",
              name: "Lithology hierarchy",
            },
          ],
        },
      ],
    },
    {
      slug: "measurements",
      name: "Measurements",
    },
    {
      slug: "integrations",
      name: "Integrations",
      children: [
        {
          slug: "xdd",
          name: "xDD",
          children: [
            {
              slug: "feedback",
              name: "Feedback",
            },
            {
              slug: "extractions",
              name: "Extractions",
            }
          ]
        },
      ],
    },
    {
      slug: "maps",
      name: "Maps",
      children: [
        {
          param: "@id",
          name(urlPart, ctx) {
            return h(
              "code",
              // Get the map slug from either JSON or GeoJSON
              ctx.pageProps?.map?.slug ??
                ctx.pageProps?.map?.properties?.slug ??
                urlPart
            );
          },
          children: [
            {
              slug: "legend",
              name: "Legend",
            },
          ],
        },
        {
          slug: "ingestion",
          name: "Ingestion",
          children: [
            {
              param: "@id",
              name(urlPart, ctx) {
                return h(
                  "code",
                  // Get the map slug from either JSON or GeoJSON
                  ctx.pageProps?.source?.slug ??
                    ctx.pageProps?.source?.properties?.slug ??
                    urlPart
                );
              },
              children: [
                { slug: "meta", name: "Metadata" },
                { slug: "polygons", name: "Polygons" },
                { slug: "lines", name: "Lines" },
                { slug: "points", name: "Points" },
              ],
            },
          ],
        },
        { slug: "legend", name: "Legend items" },
      ],
    },
    {
      slug: "lex",
      name: "Lexicon",
      children: [
        {
          slug: "lithologies",
          name: "Lithologies",
        },
        {
          slug: "mineral",
          name: "Mineral",
        },
        {
          slug: "structure",
          name: "Structure",
        },
        {
          slug: "economic",
          name: "Economic",
        },
        {
          slug: "environment",
          name: "Environment",
        },
        {
          slug: "interval",
          name: "Interval",
        },
        {
          slug: "timescale",
          name: "Timescale",
        },
        {
          slug: "lith-att",
          name: "Lithology attribute",
        },
        {
          slug: "structures",
          name: "Structures",
        },
        {
          slug: "lith-atts",
          name: "Lithology attributes",
        },
        {
          slug: "strat-concepts",
          name: "Strat Concepts",
        },
        {
          slug: "strat-names",
          name: "Stratigraphic names",
        },
        {
          slug: "intervals",
          name: "Intervals",
        },
        {
          slug: "environments",
          name: "Environments",
        },
        {
          slug: "economics",
          name: "Economics",
        },
        {
          slug: "timescales",
          name: "Timescales",
        },
      ],
    },
    columnsSubtree,
    {
      slug: "projects",
      name: "Projects",
      children: [
        {
          param: "@project",
          name(urlPart, ctx) {
            return ctx.pageProps?.project?.project ?? urlPart;
          },
          children: [{ ...columnsSubtree, disabled: true }],
        },
      ],
    },
  ],
};
