export function pageInfo(ctx: any) {
  const id = String(ctx.routeParams?.run ?? "");
  return { name: `Run ${id.slice(0, 8)}` };
}
