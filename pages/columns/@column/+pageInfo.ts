import type { PageInfo } from "~/_utils/helpers.ts";

export function pageInfo(pageContext: any): PageInfo {
  return {
    name: pageContext.data.columnInfo.col_name,
    identifier: pageContext.data.columnInfo.col_id,
  };
}
