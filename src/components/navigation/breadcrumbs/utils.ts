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

    // The site root carries the wordmark rather than a plain label. It's
    // flagged here rather than special-cased downstream because a trail that
    // shows the Macrostrat logo drops this crumb entirely — the logo is the
    // same link.
    const isRoot = i === 0 && slug === "";
    let shortTitle = pageInfo?.shortTitle;
    if (isRoot) {
      text = "Macrostrat";
      shortTitle = () => h("h1.macrostrat-wordmark.small", "Macrostrat");
    }

    return {
      href: breadcrumbItem.url,
      ...pageInfo,
      shortTitle,
      name: text,
      slug,
      isRoot,
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
  /** The site root (`/`), which the Macrostrat logo already links to. */
  isRoot?: boolean;
}
