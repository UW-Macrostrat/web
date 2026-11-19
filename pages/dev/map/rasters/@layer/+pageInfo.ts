export function pageInfo(ctx: any) {
  const name = ctx.data?.name ?? String(ctx.routeParams?.layer ?? "");
  return { name, title: name, shortTitle: name };
}
