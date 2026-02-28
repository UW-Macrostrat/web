import { PageInfo } from "~/_utils/breadcrumbs.ts";

export function pageInfo(pageContext: any): PageInfo {
  const { data } = pageContext;
  const { resData } = data;
  return {
    name: resData.strat_name_long,
  };
}
