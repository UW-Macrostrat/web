export function pageInfo(ctx: any) {
  const name = `Raster ${String(ctx.routeParams?.id ?? "")}`;
  return { name, title: name, shortTitle: name };
}
