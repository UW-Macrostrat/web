import { getGroupedColumns } from "./grouped-cols";

export async function data(pageContext) {
  // https://v2.macrostrat.org/api/v2/columns?col_id=3&response=long
  const res = await getGroupedColumns({ project_id: 1 });
  return { allColumnGroups: res, project_id: 1 };
}
