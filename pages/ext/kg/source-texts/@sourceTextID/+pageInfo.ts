import type { SourceTextPageData } from "./+data";

/** "Source text" with the numeric id right-aligned in the title row. */
export function pageInfo(ctx: any) {
  const data: SourceTextPageData | undefined = ctx.data;
  const id = data?.sourceText?.id ?? Number(ctx?.routeParams?.sourceTextID);
  const info: { name: string; identifier?: number } = { name: "Source text" };
  if (Number.isFinite(id)) info.identifier = id;
  return info;
}
