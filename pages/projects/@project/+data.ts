import { fetchAPIData, getGroupedColumns } from "#/columns/utils";

export async function data(pageContext) {
  // `.page.server.js` files always run in Node.js; we could use SQL/ORM queries here.
  const project_id = pageContext.routeParams.project;

  const projects = await fetchAPIData(`/defs/projects`, {
    project_id,
    in_process: true,
  });
  const project = projects[0];

  const columnGroups = await getGroupedColumns(project_id);

  return {
    columnGroups,
    project,
    linkPrefix: `/projects/${project_id}/`,
  };
}
