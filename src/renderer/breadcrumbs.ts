import h from "@macrostrat/hyper";
import { usePageContext } from "./page-context";
import { Breadcrumbs } from "@blueprintjs/core";
import type { PageContext } from "./types";
import React from "react";

export function PageBreadcrumbs() {
  const ctx = usePageContext();
  return h(Breadcrumbs, {
    items: buildBreadcrumbs(ctx.urlPathname, sitemap, ctx),
  });
}

function buildBreadcrumbs(
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
          slug: "lithology",
          name: "Lithology",
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
