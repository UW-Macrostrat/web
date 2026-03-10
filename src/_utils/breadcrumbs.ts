import type { PageContext } from "vike/types";
import type { ReactNode } from "react";

export function buildBreadcrumbs(ctx: PageContext): Item[] {
  const currentPath = ctx.urlPathname;
  const routes = sitemap;
  const parts = currentPath.split("/");
  const items: Item[] = [];
  let children = [routes];
  let route = "";

  // Assemble pageInfo lookup table
  const values = ctx.sources.pageInfo[0].values;
  const cfgIndex = new Map<string, PageInfo>();
  for (const item of values) {
    let configFileLocation = item.definedAt.split(" > ")?.[0];

    configFileLocation = configFileLocation.replace("/pages/", "/");
    configFileLocation = configFileLocation.replace(/\/\+.+\.ts$/, "");

    let val = item.value;
    if (typeof val === "function") {
      val = val(ctx);
    }

    cfgIndex.set(configFileLocation, val);
  }

  //console.log(v2);
  const routeElements = ctx.pageId.replace(/^\/pages/, "").split("/");

  if (routeElements[routeElements.length - 1] === "index") {
    // Remove the trailing index route
    routeElements.pop();
  }

  let urlAccum = "";
  let routeAccum = "";

  for (const urlElement of routeElements) {
    if (urlElement.startsWith("(") && urlElement.endsWith(")")) {
      // Skip (parentheses) route domains (which are skipped in Vike's routing engine)
      continue;
    }
    let urlPart = urlElement;
    if (urlPart.startsWith("@")) {
      const param = urlPart.replace(/^@/, "");
      if (param in ctx.routeParams) {
        urlPart = ctx.routeParams[param];
      }
    }

    if (!routeAccum.endsWith("/")) {
      routeAccum += "/";
    }
    routeAccum += urlElement;

    if (!urlAccum.endsWith("/")) {
      urlAccum += "/";
    }
    urlAccum += urlPart;

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
    // Capitalize th text if it's not a parameter
    if (text == urlPart) {
      text = text.charAt(0).toUpperCase() + text.slice(1);
    }

    let item = {
      disabled: child?.disabled ?? false,
      href: route == currentPath ? null : route,
      name: text,
    };

    const locationMatch = cfgIndex.get(routeAccum); // v2.find((v) => v.location == routeAccum);
    if (locationMatch != null) {
      item = {
        ...item,
        ...locationMatch,
      };
    }

    items.push(item);
    children = child?.children;
  }

  return items;
}

export interface PageInfo {
  name: string;
  title?: () => ReactNode;
  shortTitle?: () => ReactNode;
  identifier?: number;
}

export interface Item extends PageInfo {
  href?: string;
  current?: boolean;
  disabled?: boolean;
}

interface Routes {
  slug?: string;
  name: string | ((urlPart: string, ctx: PageContext) => string);
  param?: string;
  disabled?: boolean;
  children?: Routes[];
}

const columnsSubtree = {
  slug: "columns",
  name: "Columns",
  children: [
    {
      slug: "groups",
      name: "Groups",
      children: [
        {
          param: "@id",
          name(urlPart, ctx) {
            return ctx.pageProps?.group?.group_id ?? urlPart;
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
            },
            {
              slug: "sources",
              name: "Sources",
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
            console.log("url part", urlPart, ctx.data);
            // Get the map slug from either JSON or GeoJSON
            return (
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
                // Get the map slug from either JSON or GeoJSON
                return (
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
