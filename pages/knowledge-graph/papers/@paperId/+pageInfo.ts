import type { PaperPageData } from "./+data";

/** Breadcrumb + title from the paper's citation; falls back to the id until
 * data has loaded. */
export function pageInfo(ctx: any) {
  const data: PaperPageData | undefined = ctx.data;
  const title = data?.publication?.citation?.title;
  return { name: title ?? data?.paperId ?? "Paper" };
}
