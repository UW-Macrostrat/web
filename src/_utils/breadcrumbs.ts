import type { PageContext } from "vike/types";

export function buildBreadcrumbs(ctx: PageContext): Item[] {
  return buildBreadcrumbsV1(ctx.urlPathname, sitemap, ctx);
}

function buildBreadcrumbsData(pageContext) {
  const values = pageContext.sources.pageName[0].values;
  return values.map((item) => {
    let configFileLocation = item.definedAt.split(" > ")?.[0];

    configFileLocation = configFileLocation.replace("/pages/", "/");
    configFileLocation = configFileLocation.replace(/\+.+\.ts$/, "");

    let val = item.value;
    if (typeof val === "function") {
      val = val(pageContext);
    }
    return {
      location: configFileLocation,
      pageName: val,
    };
  });
}

export function buildBreadcrumbsV1(
  currentPath: string,
  routes: Routes,
  ctx: PageContext
): Item[] {
  const parts = currentPath.split("/");
  const items: Item[] = [];
  let children = [routes];
  let route = "";

  console.log(currentPath, parts);

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
    // if (name == urlPart) {
    //   text = h("code", text);
    // }

    let disabled = child?.disabled ?? false;

    items.push({
      text,
      href: route == currentPath ? null : route,
      disabled,
    });
    children = child?.children;
  }

  console.log(currentPath, items);

  return items;
}

export interface Item {
  text: string;
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
      param: "@column",
      name(urlPart, ctx) {
        return ctx.pageProps?.columnInfo?.col_name ?? urlPart;
      },
    },
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
