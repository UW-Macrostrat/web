import { fetchAPIData } from "~/_utils/fetch-helpers";
import { parseProjectID } from "~/components/project-filter";
import { getGroupedColumns } from "./grouped-cols.ts";

export async function data(pageContext) {
  // The shared project filter (`?project_id=`); unset means every project's
  // active columns, which is what the column and correlation maps show too.
  const project_id = parseProjectID(
    pageContext.urlParsed?.search?.project_id ?? null
  );
  let params = null;
  if (project_id != null) {
    params = { project_id };
  }

  // The column set spans several projects, so the list carries project section
  // headers — and `getGroupedColumns` reports only `project_id`. Load the
  // project definitions here rather than from the client, so a name is
  // available for the first paint.
  const [allColumnGroups, projects] = await Promise.all([
    getGroupedColumns(params),
    fetchAPIData("/defs/projects", { all: true }),
  ]);

  return { allColumnGroups, projects, project_id };
}
