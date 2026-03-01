import type { PageInfo } from "~/_utils/breadcrumbs.ts";

export function pageInfo(pageContext: any): PageInfo {
  const { data } = pageContext;
  const { project } = data;
  return {
    name: project.project,
    identifier: project.project_id,
  };
}
