import h from "@macrostrat/hyper";
import { lexPageInfo } from "~/components/lex/page-info.ts";
import { LexItemData } from "~/components/lex/data-loaders.ts";
import { StratTag } from "~/components/general";

export function pageInfo(ctx: any) {
  const data: LexItemData = ctx.data;
  const r = data?.resData ?? {};
  return lexPageInfo({
    name: r.name,
    color: r.color,
    identifier: data.id,
    kind: h(StratTag, { isConcept: true }),
  });
}
