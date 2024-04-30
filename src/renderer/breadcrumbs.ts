import h from "@macrostrat/hyper";
import { usePageContext } from "./page-context";
import { Breadcrumbs } from "@blueprintjs/core";
import type { PageContext } from "./types";
import React from "react";

export function PageBreadcrumbs() {
  const ctx = usePageContext();
  return h(Breadcrumbs, {
    items: buildBreadcrumns(ctx.urlPathname, sitemap, ctx),
  });
}

function buildBreadcrumns(
  currentPath: string,
  routes: Routes,
  ctx: PageContext
): Item[] {
  const parts = currentPath.split("/");
  const items: Item[] = [];
  let children = [routes];
  let route = "";

  for (const urlPart of parts) {
    if (children == null) {
      break;
    }
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

    if (child == null) {
      break;
    }
    if (route.endsWith("/")) {
      route = route.slice(0, -1);
    }
    route += `/${urlPart}`;
    const { name } = child;

    const text = typeof name === "function" ? name(urlPart, ctx) : name;

    items.push({
      text,
      href: route == currentPath ? undefined : route,
    });
    children = child.children;
  }
  return items;
}

interface Item {
  text: string;
  href?: string;
  current?: boolean;
}

interface Routes {
  slug?: string;
  name: string | ((urlPart: string, ctx: PageContext) => React.ReactNode);
  param?: string;
  children?: Routes[];
}

const sitemap: Routes = {
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
  ],
};
