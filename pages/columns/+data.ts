import { getGroupedColumns } from "./grouped-cols";

export async function data(pageContext) {
  // https://v2.macrostrat.org/api/v2/columns?col_id=3&response=lon
  const allColumnGroups = await getGroupedColumns(1);
  return { allColumnGroups };
}
