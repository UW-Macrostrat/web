/** Breadcrumb title for a layer's page: its slug, straight from the route. */
export function layerPageInfo(ctx: any) {
  const name = String(ctx.routeParams?.layer ?? "");
  return { name, title: name, shortTitle: name };
}
