import h from "@macrostrat/hyper";
import { lexPageInfo } from "~/components/lex/page-info.ts";
import { LexItemData } from "~/components/lex/data-loaders.ts";
import { StratTag } from "~/components/general";

export function pageInfo(ctx: any) {
  const data: LexItemData = ctx.data;
  const r = data?.resData ?? {};
  // `/defs/strat_names` records have no `name` field — the rank-qualified
  // `strat_name_long` ("Hampton Group") is the title, and reading `name` here
  // is what left the breadcrumb falling back to the raw route id while the
  // page repeated the real title in an `<h1>` of its own.
  return lexPageInfo({
    name: r.strat_name_long ?? r.strat_name,
    color: r.color,
    identifier: data.id,
    kind: h(StratTag, { isConcept: false }),
  });
}
