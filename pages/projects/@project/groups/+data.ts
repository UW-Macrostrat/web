import { render } from "vike/abort";
import { fetchAllProjects, fetchAPIData } from "~/_utils/fetch-helpers";
import { findProject } from "~/components/project-filter/model";

/** The project's column groups. The route takes a slug or a numeric id, as
 * the project overview does; the groups API wants the id. */
export async function data(pageContext) {
  const key = String(pageContext.routeParams.project ?? "");
  const projects = await fetchAllProjects();
  const project = findProject(projects, key);
  if (project == null) {
    throw render(404, `Project "${key}" not found.`);
  }

  const columnGroups = await fetchAPIData("/defs/groups", {
    project_id: project.project_id,
  });

  return { project, columnGroups };
}
