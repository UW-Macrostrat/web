import { lexPageInfo, routeId } from "~/components/lex/page-info.ts";
import { capitalizeWords } from "~/components/lex/timescale-data";

export function pageInfo(ctx: any) {
  const id = routeId(ctx);
  const { res } = ctx.data ?? {};
  const timescale = res?.find((d: any) => d.timescale_id === id);
  return lexPageInfo({
    name: capitalizeWords(timescale?.timescale),
    identifier: id,
  });
}
