import { fetchAPIData, fetchPGData } from "~/_utils";

export async function getGroupedColumns(project_id: number | null, params?: any) {
  // lex filter
  const useBase = !params?.liths && !params?.units && !params?.strat_names && !params?.intervals;

  const columnURL = useBase ? "/col_base" : "/col_data";

  const pgParams = project_id != null ? { ...params, project_id: `eq.${project_id}` } : params;

  const [columns, groups] = await Promise.all([
    fetchPGData(columnURL, pgParams),
    fetchAPIData(`/defs/groups`, { all: true }),
  ]);

  if(!columns) {
    return null
  }

  columns.sort((a, b) => a.col_id - b.col_id);

  // Group by col_group
  // Create a map of column groups
  const groupMap = new Map<number, ColumnGroup>(
    groups.map((g) => [
      g.col_group_id,
      { name: g.name, id: g.col_group_id, columns: [] },
    ])
  );
  groupMap.set(-1, {
    id: -1,
    name: "Ungrouped",
    columns: [],
  });

  for (const col of columns) {
    const col_group_id = col.col_group_id ?? -1;
    const group = groupMap.get(col_group_id);
    group.columns.push(col);
  }

  const groupsArray = Array.from(groupMap.values()).filter(
    (g) => g.columns.length > 0
  );

  // Sort the groups by id
  groupsArray.sort((a, b) => {
    if (a.id === -1) return 1; // Ungrouped should come last
    return a.id - b.id;
  });

  return groupsArray;
}