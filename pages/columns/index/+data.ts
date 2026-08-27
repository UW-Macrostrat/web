import { fetchAPIData } from "~/_utils/fetch-helpers";
import { getGroupedColumns } from "./grouped-cols.ts";

export async function data(pageContext) {
  // The column set spans several projects, so the list carries project section
  // headers — and `getGroupedColumns` reports only `project_id`. Load the
  // project definitions here rather than from the client, so a name is
  // available for the first paint.
  const [allColumnGroups, projects] = await Promise.all([
    getGroupedColumns({ project_id: 1 }),
    fetchAPIData("/defs/projects", { all: true }),
  ]);

  return { allColumnGroups, projects, project_id: 1 };
}
