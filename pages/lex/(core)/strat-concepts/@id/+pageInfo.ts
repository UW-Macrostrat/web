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
    // rem, so the badge stays the same size in the large title and the bar
    kind: h(StratTag, { isConcept: true, fontSize: "0.75rem" }),
  });
}
