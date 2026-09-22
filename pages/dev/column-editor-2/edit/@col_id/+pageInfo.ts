import type { PageInfo } from "~/_utils/helpers.ts";

export function pageInfo(pageContext: any): PageInfo {
  const info = pageContext.data?.columnInfo;
  if (info == null) {
    return { name: "Column" };
  }
  return {
    name: info.col_name,
    identifier: info.col_id,
  };
}
