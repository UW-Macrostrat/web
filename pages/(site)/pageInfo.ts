/** Breadcrumb labels and the tab title come from the vault pages' titles: the
 * current page's for the last crumb, its ancestors' for the rest (keyed by URL
 * slug, which is all the breadcrumb bar knows about an ancestor). */
export function pageInfo(ctx: any) {
  const labels: Record<string, string> = ctx.siteCrumbs ?? {};
  const title: string = ctx.siteTitle ?? "Macrostrat";
  return {
    shortName: title,
    name(slug: string) {
      return labels[slug] ?? slug;
    },
  };
}
