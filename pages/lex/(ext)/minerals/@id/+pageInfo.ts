import { lexPageInfo, routeId } from "~/components/lex/page-info.ts";

export function pageInfo(ctx: any) {
  const r = ctx.data?.resData ?? {};
  return lexPageInfo({ name: r.mineral, identifier: routeId(ctx) });
}
