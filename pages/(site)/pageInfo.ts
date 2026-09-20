/** The tab title and page heading come from the vault page's title. */
export function pageInfo(ctx: any) {
  return { name: ctx.siteTitle ?? "Macrostrat" };
}
