/** Page info for documentation pages: the tab title comes from the rendered
 * page, and breadcrumb labels come from the navigation trail (the site's
 * breadcrumb bar only knows each ancestor's URL slug). */
export function pageInfo(ctx: any) {
  const title: string = ctx.title ?? "Documentation";
  const labels: Record<string, string> = ctx.docsCrumbs ?? {};
  return {
    shortName: title,
    name(slug: string) {
      if (slug === "docs") return "Documentation";
      return labels[slug] ?? slug;
    },
  };
}
