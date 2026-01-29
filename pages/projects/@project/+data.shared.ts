import { getGroupedColumns } from "#/columns/index/grouped-cols";
import { fetchAPIData } from "~/_utils/fetch-helpers";

export async function data(pageContext) {
  // `.page.server.js` files always run in Node.js; we could use SQL/ORM queries here.
  const _project_id = pageContext.routeParams.project;

  const project_id = Number(_project_id);

  const projects = await fetchAPIData(`/defs/projects`, {
    project_id,
    in_process: true,
  });
  const project = projects[0];

  const allColumnGroups = await getGroupedColumns({ project_id });

  return {
    allColumnGroups,
    project,
    linkPrefix: `/projects/${project_id}/`,
  };
}
