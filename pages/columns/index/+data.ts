import { fetchAPIData } from "~/_utils/fetch-helpers";
import {
  parseProjectFilter,
  projectIDParam,
  resolveProjectIDs,
} from "~/components/project-filter/model";
import { getGroupedColumns } from "./grouped-cols.ts";

export async function data(pageContext) {
  // The project definitions come first: the list's section headers need names,
  // and the shared project filter (`?project_id=`, slugs) has to be resolved to
  // the numeric ids the API takes. Unset means the API's default, the "Core
  // columns" composite — what the column and correlation maps show too.
  const projects = await fetchAPIData("/defs/projects", { all: true });
  const projectSlugs = parseProjectFilter(
    pageContext.urlParsed?.search?.project_id ?? null
  );
  const projectIDs = resolveProjectIDs(projects, projectSlugs);
  const project_id = projectIDParam(projectIDs);

  let params = null;
  if (project_id != null) {
    params = { project_id };
  }
  const allColumnGroups = await getGroupedColumns(params);

  return { allColumnGroups, projects, projectSlugs, project_id };
}
