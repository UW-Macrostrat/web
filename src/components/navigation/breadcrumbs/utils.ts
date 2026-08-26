import type { ReactNode } from "react";
import h from "./breadcrumbs.module.sass";

export function buildBreadcrumbs(ctx: Vike.PageContext): Item[] {
  const breadcrumbs = ctx.breadcrumbs;

  let errorText: string | null = null;
  if (ctx.is404) {
    /** Find the longest matching URL to split into route elements, to give the user a potential
     * path back to their starting point.
     */
    errorText = "Not found";
  } else if (ctx.abortReason != null) {
    errorText = "Error";
  }
  if (errorText != null) {
    // Replace the last matched path with an error
    breadcrumbs.pop();
    breadcrumbs.push({ slug: errorText });
  }

  return breadcrumbs.map((breadcrumbItem, i) => {
    let slug = breadcrumbItem.slug;

    let pageInfo: ((ctx: Vike.PageContext) => PageInfo) | PageInfo | null =
      null;
    if (breadcrumbItem.pageId != null) {
      let pageConfig = ctx.pages[breadcrumbItem.pageId].config;

      pageInfo = pageConfig.pageInfo;
      if (typeof pageInfo === "function") {
        pageInfo = pageInfo(ctx);
      }
    }

    const name = pageInfo?.name ?? slug;
    //
    let text = typeof name === "function" ? name(slug, ctx) : name;
    // // Capitalize th text if it's not a parameter
    if (text == slug) {
      text = text.charAt(0).toUpperCase() + text.slice(1);
    }

    let title = undefined;
    if (i == 0 && slug == "") {
      text = "Macrostrat";
      pageInfo.shortTitle = () => h("h1.macrostrat-wordmark.small", text);
    }

    return {
      href: breadcrumbItem.url,
      title,
      ...pageInfo,
      name: text,
      slug,
    };
  });
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
