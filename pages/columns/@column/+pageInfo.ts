import type { PageInfo } from "~/components/navigation/breadcrumbs/utils";

export function pageInfo(pageContext: any): PageInfo | null {
  // Data loads client-side only, so server renders (e.g. error pages) lack it.
  const info = pageContext.data?.columnInfo;
  if (info == null) {
    return null;
  }
  return { name: info.col_name, identifier: info.col_id };
}
