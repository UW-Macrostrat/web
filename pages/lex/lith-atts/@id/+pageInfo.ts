import { lexPageInfo, routeId } from "~/components/lex/page-info";

export function pageInfo(ctx: any) {
  const r = ctx.data?.resData ?? {};
  return lexPageInfo({ name: r.name, identifier: routeId(ctx) });
}
