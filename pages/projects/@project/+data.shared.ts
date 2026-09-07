import { fetchAPIData } from "~/_utils/fetch-helpers";
import { render } from "vike/abort";
import { findProject } from "~/components/project-filter/model";

/** The project overview needs only the project definition: its description,
 * counts and (for a composite) member projects. The columns themselves live on
 * `/columns?project_id=…`, which the page links to. */
export async function data(pageContext) {
  // The route takes a slug (`/projects/north-america`, the preferred form) or
  // a numeric id. The API resolves ids only, so look the project up in the
  // full definition list.
  const key = String(pageContext.routeParams.project ?? "");
  const projects = await fetchAPIData(`/defs/projects`, { all: true });
  const project = findProject(projects, key);
  if (project == null) {
    throw render(404, `Project "${key}" not found.`);
  }

  return { project, project_id: project.project_id };
}
