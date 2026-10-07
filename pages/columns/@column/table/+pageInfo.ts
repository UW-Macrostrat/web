import type { PageInfo } from "~/components/navigation/breadcrumbs/utils";

export function pageInfo(pageContext: any): PageInfo {
  const info = pageContext.data?.columnInfo;
  if (info == null) {
    return { name: "Table" };
  }
  return { name: "Table", identifier: info.col_id };
}
