import type { PageInfo } from "~/_utils/helpers.ts";

export function pageInfo(pageContext: any): PageInfo {
  const { data } = pageContext;
  const { project } = data;
  return {
    name: project.project,
    identifier: project.project_id,
  };
}
