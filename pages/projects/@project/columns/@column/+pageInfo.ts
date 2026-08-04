import type { PageInfo } from "~/_utils/helpers.ts";

export function pageInfo(pageContext: any): PageInfo {
  const { columnInfo } = pageContext.data;
  return {
    name: columnInfo.col_name,
    identifier: columnInfo.col_id,
  };
}
